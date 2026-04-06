import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import cx from "clsx";
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

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

  const [sorting, setSorting] = React.useState([]);

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


  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef();
  const rows = table.getRowModel().rows;


  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <h2>JWST TSO observations</h2>

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
        //<tbody className="bg-white text-xs">
        //  {table.getRowModel().rows.map((row, idx) => (
        //    <tr key={row.id} className="group">
        //      {row.getVisibleCells().map((cell, idx) => {
        //        const { columnDef } = cell.column;
        //        return (
        //          <td
        //            key={cell.id}
        //            className={cx(
        //              "px-4 py-1 whitespace-nowrap border border-gray-500 bg-white",
        //              idx === 0 && "sticky left-0 z-10 bg-red-100"
        //            )}
        //          >
        //            {flexRender(columnDef.cell, cell.getContext())}
        //          </td>
        //        );
        //      })}
        //    </tr>
        //  ))}
        //</tbody>


