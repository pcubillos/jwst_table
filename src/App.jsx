import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
  ChevronRight
} from 'lucide-react';

const green = "#15B01A";
const badKeywords = ["Failed", "Skipped", "Withdrawn"];

const formatPlanets = (value) => {
  try {
    const arr = JSON.parse(value.replace(/'/g, '"'));
    return arr.join(", ");
  } catch {
    return value;
  }
};

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
    { header: "Category", accessorKey: "category" },
    { header: "PID", accessorKey: "pid",
      meta: { sticky: true},
    },
    { header: "PI", accessorKey: "pi" },
    { header: "Target", accessorKey: "target" },
    { header: "Planet(s)", accessorKey: "planets",
        cell: (info) => formatPlanets(info.getValue()),
    },
    { header: "Event", accessorKey: "event" },
    { header: "Status", accessorKey: "status",
      cell: (info) => {
        const value = String(info.getValue());
        const isBad = badKeywords.some(k => value.includes(k));
        return (
          <span className={cx(isBad ? "text-red" : "text-green")}>
            {value}
          </span>
        );
      },
    },
    { header: "Cycle", accessorKey: "cycle" },
    { header: "Observation", accessorKey: "observation" },
    { header: "Visit", accessorKey: "visit" },
    { header: "Instrument", accessorKey: "instrument" },
    { header: "Mode", accessorKey: "mode" },
    { header: "Disperser", accessorKey: "disperser" },
    { header: "Filter", accessorKey: "filter" },
    { header: "Subarray", accessorKey: "subarray" },
    { header: "Readout", accessorKey: "readout" },
    { header: "Groups", accessorKey: "groups" },
    { header: "Integrations", accessorKey: "integrations" },
    { header: "Duration", accessorKey: "duration" },

    { header: "Date start", accessorKey: "date_start" },
    { header: "Plan window", accessorKey: "plan_window" },
    { header: "Proprietary period", accessorKey: "proprietary_period" },
    { header: "RA", accessorKey: "ra" },
    { header: "Dec", accessorKey: "dec" },
  ];

  const [sorting, setSorting] = React.useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });


  return (

    <div className="overflow-x-auto bg-white shadow-md rounded-lg">

        <h2>JWST Exoplanet Observations</h2>

        {/* Pagination div */}
        <div className="flex flex-col sm:flex-row justify-between items-center ml-2 mb-2 text-sm text-gray-700">
          <div className="flex items-center mb-4 sm:mb-0">
            <span className="mr-2">Items per page</span>
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
          <thead className="bg-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} >
                {headerGroup.headers.map((header) => (
                  <th
                      key={header.id}
                      className="px-2 py-2 text-center text-xs font-medium text-black uppercase"
                  >
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
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id} className="hover:bg-gray-50" >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500" >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
            ))}
          </tbody>
        </table>

      </div>
  );
}

