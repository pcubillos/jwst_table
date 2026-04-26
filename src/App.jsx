import React, {
 useEffect,
 useState,
 useRef,
} from "react";
import Papa from "papaparse";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
} from "@tanstack/react-table";
import cx from "clsx";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  ChevronRight,
} from 'lucide-react';
import { parse, addMonths, isBefore } from "date-fns"

const badKeywords = ["Failed", "Skipped", "Withdrawn"];

const formatPlanets = (value) => {
  try {
    const arr = JSON.parse(value.replace(/'/g, '"'));
    return arr.join(", ");
  } catch {
    return value;
  }
};

function Filter({ column, table }) {
  const value = column.getFilterValue() ?? "";
  const inst_filter = table.getColumn("instrument").getFilterValue() ?? "";
  const instruments = inst_filter ? [inst_filter]
    : Array.from(
        table.getColumn("instrument").getFacetedUniqueValues().keys()
      )

  const values = Array.from(column.getFacetedUniqueValues().keys())
  const isNumeric = values.every(v => !isNaN(Number(v)))
  const options = isNumeric
    ? values.sort((a, b) => Number(a) - Number(b))
    : values.sort()

  const grouped = column.getFacetedRowModel().rows.reduce((acc, row) => {
      const instrument = row.getValue("instrument")
      const value = row.getValue(column.id)

      if (!instruments.includes(instrument)) {
        return acc
      }
      if (!acc[instrument]) {
        acc[instrument] = new Set()
      }
      if (typeof value === "string" && value.includes(",")) {
        value.split(",").forEach(v => {
          const trimmed = v.trim()
          if (trimmed) acc[instrument].add(trimmed)
        })
      } else {
        acc[instrument].add(value)
      }
      return acc
    }, {})

  const groups = Object.fromEntries(
    Object.entries(grouped).map(([key, set]) => [key, [...set].sort()])
  )

  const { filterVariant } = column.columnDef.meta ?? {}
  return filterVariant === 'select' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={value}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">all</option>
      <option value="transit">transit</option>
      <option value="eclipse">eclipse</option>
      <option value="phase">phase curve</option>
    </select>
  ) : filterVariant === 'select_faceted' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={value}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">all</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ) : filterVariant === 'select_grouped' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={value}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">all</option>
      {Object.entries(groups).map(([label, set]) => (
        <optgroup key={label} label={label}>
          {[...set].sort().map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  ) : (
    <input
      value={value}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder="Search"
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    />
  )
}


function getRowStyles(rowColor) {
  if (rowColor === 'planned') {
    return {
        base: "text-planned",
        hover: "group-hover:bg-planned-bkg",
    };
  }
  if (rowColor === 'failed') {
    return {
        base: "text-fail",
        hover: "group-hover:text-fail group-hover:bg-fail-bkg",
    };
  }
  if (rowColor === 'public') {
    return {
        base: "text-planned",
        hover: "group-hover:text-public group-hover:bg-public-bkg",
    };
  }
  if (rowColor === 'proprietary') {
    return {
        base: "text-planned",
        hover: "group-hover:text-proprietary group-hover:bg-proprietary-bkg",
    };
  }
}


export default function App() {

  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/jwst_tso_programs.csv")
      .then((res) => res.text())
      .then((csv) => {
        const result = Papa.parse(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        setData(result.data);
      });
  }, []);

  const columns = [
    { header: "Category", accessorKey: "category",
      meta: { filterVariant: 'select_faceted' },
    },
    { header: "PID", accessorKey: "pid",
      cell: (info) => {
        const state = releaseStatus(info.row)
        return (
            <a href={`https://www.stsci.edu/jwst/science-execution/program-information?id=${info.getValue()}`}
              className={cx(
                "hover:underline badge",
                `badge-${state}`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {info.getValue()}
            </a>
        )},
      meta: { sticky: true },
      filterFn: 'includesString',
    },
    { header: "PI", accessorKey: "pi" },
    { header: "Target", accessorKey: "target" },
    { header: "Planet(s)", accessorKey: "planets",
      cell: (info) => formatPlanets(info.getValue()),
      meta: { filterVariant: 'select_faceted' },
    },
    { header: "Event", accessorKey: "event",
      meta: { filterVariant: 'select' },
    },
    { header: "Status", accessorKey: "status",
      cell: (info) => {
        const value = String(info.getValue());
        const state = releaseStatus(info.row)
        return (
          <span className={cx("badge", `badge-${state}`)}>
            {value}
          </span>
        );
      },
      meta: { filterVariant: 'select_faceted' },
    },
    { header: "Cycle", accessorKey: "cycle",
      meta: { filterVariant: 'select_faceted' },
      filterFn: 'includesString',
    },
    { header: "Observation", accessorKey: "observation",
      filterFn: 'includesString',
    },
    { header: "Visit", accessorKey: "visit",
      filterFn: 'includesString',
    },
    { header: "Instrument", accessorKey: "instrument",
      meta: { filterVariant: 'select_faceted' },
    },
    { header: "Mode", accessorKey: "mode",
      meta: { filterVariant: 'select_grouped' },
    },
    { header: "Disperser", accessorKey: "disperser",
      meta: { filterVariant: 'select_grouped' },
    },
    { header: "Filter", accessorKey: "filter",
      meta: { filterVariant: 'select_grouped' },
    },
    { header: "Subarray", accessorKey: "subarray",
      meta: { filterVariant: 'select_grouped' },
    },
    { header: "Readout", accessorKey: "readout",
      meta: { filterVariant: 'select_grouped' },
    },
    { header: "Groups", accessorKey: "groups",
      filterFn: 'includesString',
    },
    { header: "Integrations", accessorKey: "integrations",
      filterFn: 'includesString',
    },
    { header: "Duration", accessorKey: "duration" },

    { header: "Date start", accessorKey: "date_start" },
    { header: "Plan window", accessorKey: "plan_window" },
    { header: "Proprietary period", accessorKey: "proprietary_period",
      meta: { filterVariant: 'select_faceted' },
      filterFn: 'includesString',
    },
    { header: "RA", accessorKey: "ra" },
    { header: "Dec", accessorKey: "dec" },
  ];


  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });


  const releaseDate = (start, plan, proprietary) => {
      if (start) {
        const date = parse(start, "yyyy-MM-dd HH:mm:ss", new Date())
        return addMonths(date, proprietary)
      }
      if (plan) {
        const plan_date = plan.split(" - ")[0]
        const date = parse(plan_date, "yyyy-MM-dd", new Date())
        return addMonths(plan_date, proprietary)
      }
      return null
  };

  const releaseStatus = (row) => {
    const state = String(row.original.status?? "")
    const isBad = badKeywords.some(k => state.includes(k))
    if (isBad) return "failed"

    const start = row.getValue("date_start")
    if (!start) return "planned"

    const plan = row.getValue("plan_window")
    const proprietary = row.getValue("proprietary_period")

    const now = new Date()
    const finalDate = releaseDate(start, plan, proprietary)

    if (!finalDate) return "planned"
    if (isBefore(finalDate, now)) return "public"
    return "proprietary"
  }

  const { pageIndex, pageSize } = table.getState().pagination
  const first_entry = pageSize * pageIndex + 1
  const last_entry = Math.min((pageIndex+1) * pageSize, table.getRowCount())

  const hasFilters = table.getState().columnFilters.length > 0

  return (
    <div className="container overflow-x-auto bg-white shadow-md rounded-lg">

        <h2>JWST Exoplanet Observations</h2>

        {/* Pagination div */}
        <div className="sticky left-2 flex flex-col sm:flex-row justify-between items-center ml-2 mb-2 text-sm text-gray-700">
          <button
            onClick={() => table.resetColumnFilters()}
            disabled={!hasFilters}
            className="px-2 py-1 rounded cursor-pointer bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            Reset all filters
          </button>

          <div className="flex items-center mb-4 sm:mb-0">
            <span className="mr-2">Entries per page</span>
            <select
              className="border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-2 py-2"
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[15, 25, 50, 800].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span className="mr-2 ml-2"> ({first_entry} to {last_entry} of {table.getRowCount()})</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft size={20} />
            </button>

            <button
              className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft size={20} />
            </button>

            <span className="flex items-center">
              <input
                min={1}
                max={table.getPageCount()}
                type="number"
                value={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="w-16 p-1 rounded-md border border-gray-300 text-center"
              />
              <span className="ml-1">of {table.getPageCount()}</span>
            </span>

            <button
              className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight size={20} />
            </button>

            <button
              className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight size={20} />
            </button>
          </div>
        </div>

        {/* The table */}
        <table className="min-w-full divide-y divide-gray-400">
          <thead className="sticky top-0 bg-gray-200 z-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} >
                {headerGroup.headers.map((header) => (
                  <th
                      key={header.id}
                      className={cx(
                        "px-2 py-1.5 text-center text-xs font-medium text-black uppercase",
                        header.column.id === "target"
                          ? "sticky left-0 z-40 bg-gray-200"
                          : "z-30"
                      )}
                  >
                      {header.isPlaceholder ? null : (
                      <>
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? "cursor-pointer select-none flex items-center whitespace-nowrap"
                              : "",
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          </span>
                          {{
                            asc: <ChevronUp color="black" strokeWidth={3} size={18} />,
                            desc: <ChevronDown color="black" strokeWidth={3} size={18} />,
                          }[header.column.getIsSorted()] ?? (
                            <ChevronsUpDown color="#AAA" size={18} />
                          )}
                        </div>
                        {header.column.getCanFilter() ? (
                          <div>
                            <Filter column={header.column} table={table} />
                          </div>
                        ) : null}
                      </>
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => {
              const state = String(row.original.status?? "");
              const isBad = badKeywords.some(k => state.includes(k));
              const rowColor = releaseStatus(row)
              const rowStyles = getRowStyles(rowColor)
              return (
                <tr
                  key={row.id}
                  className={cx("group", rowStyles.base)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                       key={cell.id}
                       className={cx(
                         "px-2 py-2 text-left whitespace-nowrap text-sm bg-white",
                         cell.column.id === "target"
                           ? "sticky left-0"
                           : "",
                         rowStyles.hover
                       )}
                     >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              )}
            )}
          </tbody>
        </table>

    </div>
  );
}

