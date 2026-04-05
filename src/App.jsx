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
    { header: "Event", accessorKey: "event",
      cell: (info) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {info.getValue()}
        </span>
      ),
    },
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
    { header: "Mode", accessorKey: "mode",
      cell: (info) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {info.getValue()}
        </span>
      ),
    },
    { header: "Disperser", accessorKey: "disperser" },
    { header: "Filter", accessorKey: "filter" },
    { header: "Subarray", accessorKey: "subarray" },
    { header: "Readout", accessorKey: "readout" },
    { header: "Groups", accessorKey: "groups" },
    { header: "Integrations", accessorKey: "integrations" },
    { header: "Duration", accessorKey: "duration" },

    { header: "Date start", accessorKey: "date_start",
      cell: (info) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {info.getValue()}
        </span>
      ),
    },
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

  //      style={{
  //        width: "100%",
  //        borderCollapse: "collapse",
  //        background: "#111",
  //        color: "white",
  //        borderRadius: "5px",
  //        overflow: "hidden",
  //      }}
  //    >


  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <h2>JWST TSO observations</h2>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} >
              {headerGroup.headers.map((header) => (
                <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{whiteSpace: "nowrap"}}
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
                    <span className="ml-2 flex-shrink-0">
                    &nbsp;
                    {{
                      asc: <ChevronUp color="black" strokeWidth={3} className="ml-2" size={18} />,
                      desc: <ChevronDown color="black" strokeWidth={3} className="ml-2" size={18} />,
                    }[header.column.getIsSorted()] ?? (
                      <ChevronsUpDown color="#BABABA" className="ml-2" size={18} />
                    )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: "1px solid #222",
                  padding: "0px 5px",  // top-bottom left-right
                  //position: "absolute",
                  //top: 0,
                  //transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                      key={cell.id}
                      style={{
                          padding: "5px",
                          borderRight: "1px solid #222",
                      }}
                  >
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


