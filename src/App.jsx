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
  Star,
} from 'lucide-react';
import { parse, addMonths, isBefore } from "date-fns"

import { createPortal } from "react-dom"

const Tooltip = ({ children, text }) => {
  const [pos, setPos] = React.useState(null)

  return (
    <span
      onMouseEnter={(e) => {
        const rect = e.target.getBoundingClientRect()
        setPos({ x: rect.right + 4, y: rect.top + rect.height/2})
      }}
      onMouseLeave={() => setPos(null)}
      className="truncate"
    >
      {children}
      {pos &&
        createPortal(
          <div
            className="fixed bg-black/40 text-white text-xs px-2 py-1 rounded z-50"
            style={{ left: pos.x, top: pos.y }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  )
}

const badKeywords = ["Failed", "Skipped", "Withdrawn"];

const numericFilterFn = (row, columnId, filterValue) => {
  if (!filterValue) return true;

  const cellValue = row.getValue(columnId);
  if (cellValue === undefined || cellValue === null) return false;
  const cellNum = Number(cellValue);

  // Regex to extract operator (>, <, >=, <=) and the target number
  const filterStr = String(filterValue).trim();

  if (['>', '<', '>=', '<='].includes(filterStr)) {
    return true;
  }
  const match = filterStr.match(/^(>=|<=|>|<)\s*(-?\d*\.?\d+)$/);
  if (match) {
    const operator = match[1];
    const targetValue = Number(match[2]);
    if (isNaN(targetValue)) return true;
    switch (operator) {
      case '>':  return cellNum > targetValue;
      case '<':  return cellNum < targetValue;
      case '>=': return cellNum >= targetValue;
      case '<=': return cellNum <= targetValue;
      default: return false;
    }
  }
  // Fallback: Default to string "includes" matching if no operator is typed
  const cellStr = String(cellValue);
  return cellStr.toLowerCase() === filterStr.toLowerCase();
};

const planetFinderFilterFn = (row, columnId, filterValue) => {
  if (!filterValue) return true;
  const search = String(filterValue).toLowerCase();
  const target = String(row.getValue(columnId) ?? "").toLowerCase();
  const aliases = String(row.original.aliases ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // match target OR any aka
  return (
    target.includes(search) ||
    aliases.some((a) => a.toLowerCase().includes(search))
  );
}

const favoritesFilterFn = (row, columnId, filterValue) => {
  if (filterValue !== 'favs') return true;
  return row.getIsSelected();
};


const SortIcon = ({ sortType }) => {
  if (sortType === "asc") {
    return <ChevronUp color="black" strokeWidth={3} size={18} />;
  }
  if (sortType === "desc") {
    return <ChevronDown color="black" strokeWidth={3} size={18} />;
  }
  return <ChevronsUpDown color="#AAA" size={18} />;
};


function Filter({ column, table }) {
  const value = column.getFilterValue() ?? "";
  const inst_filter = table.getColumn("instrument").getFilterValue() ?? "";
  const instruments = inst_filter ? [inst_filter]
    : Array.from(
        table.getColumn("instrument").getFacetedUniqueValues().keys()
      )

  const uniqueValues = Array.from(column.getFacetedUniqueValues().keys())
  const values = [
    ...new Set(
      uniqueValues.flatMap((value) =>
        typeof value === "string"
          ? value.split(",").map(x => x.trim()).filter(x => x !== "")
          : value != null
          ? [value]
          : []
      )
    )
  ]

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
    },
  {})

  const groups = Object.fromEntries(
    Object.entries(grouped).map(([key, set]) => [key, [...set].sort()])
  )

  const { filterVariant } = column.columnDef.meta ?? {}
  return filterVariant === 'select_favorites' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={column.getFilterValue() ?? ""}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">all</option>
      <option value="favs">favorites</option>
    </select>
  ) : filterVariant === 'select' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={value}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">all</option>
      <option value="transit">transit</option>
      <option value="eclipse">eclipse</option>
      <option value="phase">phase curve</option>
      <option value="stare">stare</option>
    </select>
  ) : filterVariant === 'select_status' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={value}
      className="mt-1 w-full border rounded-xs px-1 py-0.5 text-xs bg-gray-100 border-gray-300"
    >
      <option value="">All</option>
      <option value="not_failed">Not Failed</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
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

const columns = [
  {
    header: ({ table }) => {
    const isAllSelected = table.getIsAllRowsSelected();
    const isSomeSelected = table.getIsSomeRowsSelected();
    return (
        <div className="flex items-center justify-center w-full">
          <Tooltip text="Select / Deselect all">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer rounded border-gray-300 accent-yellow-400 bg-white focus:ring-amber-400"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = !isAllSelected && isSomeSelected;
                }
              }}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          </Tooltip>
        </div>
      );
    },
    accessorKey: "favorites",
    enableColumnFilter: true,
    enableSorting: false,
    meta: { filterVariant: 'select_favorites' },
    filterFn: 'favoritesFinder',
    cell: ({ row }) => {
      const isStarred = row.getIsSelected();
      return (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevents triggering row selection
            row.toggleSelected();
          }}
          className="focus:outline-none flex items-center justify-center w-full"
          title={isStarred ? "Unstar program" : "Star program"}
        >
          <Star
            className={cx(
              "w-4 h-4 transition-all duration-150 cursor-pointer hover:scale-110",
              isStarred
                ? "text-yellow-400 fill-white stroke-[3px]"
                : "text-gray-300 fill-white stroke-[2px]"
            )}
          />
        </button>
      );
    },
  },
  { header: "Category",
    accessorKey: "category",
    meta: { filterVariant: 'select_faceted' },
  },
  { header: "PID",
    accessorKey: "pid",
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
    meta: { sticky: true, left: 0, width: PID_WIDTH },
    filterFn: 'includesString',
  },
  { header: "PI", accessorKey: "pi" },
  { header: "Target",
    accessorKey: "target",
    meta: {
     sticky: true,
     left: PID_WIDTH,
    },
    filterFn: 'planetFinder',
    cell: (info) => {
      const value = String(info.getValue() ?? "")
      const aliases = String(info.row.original.aliases ?? "")
      return aliases ? (
        <Tooltip text={`aliases: ${aliases}`}>
          {value}
        </Tooltip>
      ) : value;
    },
  },
  { header: "aliases", accessorKey: "aliases" },
  { header: "Planet(s)",
    accessorKey: "planets",
    cell: (info) => String(info.getValue()),
    filterFn: 'includesString',
    meta: { filterVariant: 'select_faceted' },
  },
  { header: "Event",
    accessorKey: "event",
    meta: { filterVariant: 'select' },
  },
  { header: "Status",
    accessorKey: "status",
    cell: (info) => {
      const value = String(info.getValue());
      const state = releaseStatus(info.row)
      return (
        <span className={cx("badge", `badge-${state}`)}>
          {value}
        </span>
      );
    },
    meta: { filterVariant: 'select_status' },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const cellValue = String(row.getValue(columnId)).toLowerCase();
      if (filterValue === 'not_failed') {
        return !badKeywords.some(keyword => cellValue.includes(keyword.toLowerCase()));
      }
      return cellValue === String(filterValue).toLowerCase();
    },
  },
  { header: (
      <Tooltip text="Search can begin with &gt;, &gt;=, &lt;, or &lt;=">
        <span>Cycle</span>
      </Tooltip>
    ),
    accessorKey: "cycle",
    filterFn: 'numericFinder',
  },
  { header: (
      <Tooltip text="Search can begin with &gt;, &gt;=, &lt;, or &lt;=">
        <span>Observation</span>
      </Tooltip>
    ),
    accessorKey: "observation",
    filterFn: 'numericFinder',
  },
  { header: "Visit",
    accessorKey: "visit",
    meta: { filterVariant: 'select_faceted' },
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
  { header: (
      <Tooltip text="Search can begin with &gt;, &gt;=, &lt;, or &lt;=">
        <span>Groups</span>
      </Tooltip>
    ),
    accessorKey: "groups",
    filterFn: 'numericFinder',
  },
  { header: (
      <Tooltip text="Search can begin with &gt;, &gt;=, &lt;, or &lt;=">
        <span>Integrations</span>
      </Tooltip>
    ),
    accessorKey: "integrations",
    filterFn: 'numericFinder',
  },
  { header: (
      <Tooltip text="Search can begin with &gt;, &gt;=, &lt;, or &lt;=">
        <span>Duration (h)</span>
      </Tooltip>
    ),
    accessorKey: "duration",
    filterFn: 'numericFinder',
  },

  { header: "Date start", accessorKey: "date_start" },
  { header: "Plan window", accessorKey: "plan_window" },
  { header: "Proprietary period", accessorKey: "proprietary_period",
    meta: { filterVariant: 'select_faceted' },
    filterFn: 'includesString',
  },
  { header: "RA", accessorKey: "ra" },
  { header: "Dec", accessorKey: "dec" },
];


export default function App() {

  const handleDownload = (type) => {
    let exportData = [];
    if (type === "all") {
      exportData = data;
    } else if (type === "filtered") {
      exportData = table.getFilteredRowModel().rows.map(row => row.original);
    } else if (type === "favorites") {
      exportData = table.getSelectedRowModel().rows.map(row => row.original);
    }
    if (exportData.length === 0) {
      alert("No data available to download.");
      return;
    }
    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jwst_tso_programs.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [data, setData] = useState([]);
  const [updateDate, setUpdateDate] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const numericColumns = ["pid", "cycle", "groups", "integrations", "duration", "proprietary_period"]

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}jwst_tso_programs.csv`)
      .then((res) => res.text())
      .then((csv) => {
        // Extract date
        const firstNewlineIndex = csv.indexOf('\n');
        const firstLine = csv.substring(0, firstNewlineIndex);
        setUpdateDate(firstLine.replace('#', '').trim());
        // Parse remaining CSV data
        const csvNoHeader = csv.substring(firstNewlineIndex + 1);
        const result = Papa.parse(csvNoHeader, {
          header: true,
          dynamicTyping: (field) => numericColumns.includes(field),
          skipEmptyLines: true,
        });
        setData(result.data);
      });
  }, []);

  const PID_WIDTH = 75

  const [sorting, setSorting] = React.useState([{ id: 'pid', desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
      columnVisibility: {
        aliases: false,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => `${row.pid}-${row.observation}`,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: {
        planetFinder: planetFinderFilterFn,
        numericFinder: numericFilterFn,
        favoritesFinder: favoritesFilterFn,
    },
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

      {/* Banner */}
      <div className="sticky left-4 z-[60] w-full flex flex-col items-start ml-4 mb-2 text-left">
        <h2 className="text-2xl font-bold mb-3 text-center w-full">
        JWST Exoplanet TSO Programs</h2>

        <div className="flex justify-between items-center w-full pr-8">
          {updateDate && (
            <span className="text-sm text-gray-500">
              Last updated: <span className="font-medium text-gray-700">{updateDate}</span>
            </span>
          )}
          <span className="text-sm text-gray-500">
            Keys:
            <span className="mx-1 badge badge-public">Public</span>
            <span className="mx-0 badge badge-proprietary">Proprietary</span>
            <span className="mx-1 badge badge-planned">To be observed</span>
            <span className="mx-0 badge badge-failed">Failed</span>
          </span>
        </div>

        <div className="flex justify-between items-center w-full pr-8">
          <span className="text-sm text-gray-500">
            Powered by{' '}
            <a
              href="https://pcubillos.github.io/gen_tso/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            > Gen TSO </a>
            {' '}(
            <a
              href="https://ui.adsabs.harvard.edu/abs/2024PASP..136l4501C"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >Cubillos 2024</a>)
          </span>
        </div>

        <div className="flex justify-between items-center w-full pr-8">
          <span className="text-sm text-gray-500">
            Open an <a
              href="https://github.com/pcubillos/jwst_table/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >issue</a> for bug reports and requests.
          </span>

          <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="inline-flex items-center justify-between gap-x-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
            >
              Download as CSV
              <ChevronDown className="-mr-1 h-4 w-4 text-gray-400"/>
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 z-[70] mt-1 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleDownload("all");
                      setIsDownloadOpen(false);
                    }}
                    className="block w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    All data ({data.length})
                  </button>
                  <button
                    onClick={() => {
                      handleDownload("filtered");
                      setIsDownloadOpen(false);
                    }}
                    className="block w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    Filtered entries ({table.getFilteredRowModel().rows.length})
                  </button>
                  <button
                    onClick={() => {
                      handleDownload("favorites");
                      setIsDownloadOpen(false);
                    }}
                    className="block w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    Favorites ({table.getSelectedRowModel().rows.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

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
              {[50, 100, 200, 800].map((pageSize) => (
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
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta || {}
                  return (
                    <th
                        key={header.id}
                        className={cx(
                          "px-2 py-1.5 text-center text-xs font-medium text-black uppercase bg-gray-200",
                          meta.sticky && "sticky",
                        )}
                         style={
                           meta.sticky ? {
                             left: meta.left,
                             width: meta.width,
                             minWidth: meta.width,
                           } : undefined
                         }
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
                          {header.column.getCanSort() && (
                            <SortIcon sortType={header.column.getIsSorted()} />
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
                  )}
                )}
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
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta || {}
                    return (
                      <td
                        key={cell.id}
                        className={cx(
                          "px-2 py-2 text-left whitespace-nowrap text-sm bg-white",
                          meta.sticky && "sticky",
                          rowStyles.hover
                        )}
                        style={
                          meta.sticky ? { left: meta.left } : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )}
                  )}
                </tr>
              )}
            )}
          </tbody>
        </table>

    </div>
  );
}

