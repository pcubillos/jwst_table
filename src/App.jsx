import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

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
          <span style={{ color: isBad ? "red" : green }}>
            {value}
          </span>
        );
      },
    },
    { header: "Cycle", accessorKey: "cycle" },
    { header: "Observation", accessorKey: "observation" },
    { header: "Visit", accessorKey: "visit" },
    //{ header: "Target_in_program", accessorKey: "target_in_program" },
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
    //{ header: "Date_end", accessorKey: "date_end" },
    { header: "Plan window", accessorKey: "plan_window" },
    { header: "Proprietary period", accessorKey: "proprietary_period" },

    { header: "RA", accessorKey: "ra" },
    { header: "Dec", accessorKey: "dec" },

    //{ header: "Label", accessorKey: "label" },
    //{ header: "Special_reqs", accessorKey: "special_reqs" },
    //{ header: "Phase_reqs", accessorKey: "phase_reqs" },
    //{ header: "Period", accessorKey: "period" },
    //{ header: "Phase_start", accessorKey: "phase_start" },
    //{ header: "Phase_duration", accessorKey: "phase_duration" },

  ];

  //  {
  //    header: "#",
  //    cell: (info) => info.row.index + 1,
  //  },
  //  {
  //    header: "Name",
  //    accessorKey: "name",
  //    cell: (info) => (
  //      <div>
  //        <strong>{info.row.original.symbol}</strong>{" "}
  //        <span style={{ color: "#888" }}>{info.getValue()}</span>
  //      </div>
  //    ),
  //  },
  //  {
  //    header: "Price",
  //    accessorKey: "price",
  //    cell: (info) => `$${info.getValue().toLocaleString()}`,
  //  },
  //  {
  //    header: "24h %",
  //    accessorKey: "change",
  //    cell: (info) => {
  //      const value = info.getValue();
  //      return (
  //        <span style={{ color: value >= 0 ? "green" : "red" }}>
  //          {value > 0 ? "+" : ""}
  //          {value}%
  //        </span>
  //      );
  //    },
  //  },
  const [sorting, setSorting] = React.useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef();
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 48,
      overscan: 5,
  });

  return (

    <div
        ref={parentRef}
        style={{
            padding: "40px",
            //fontFamily: "Arial",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', 'Fira Sans', 'Droid Sans', Arial, sans-serif",
            //overflow: "auto",
        }}
    >
      <h2>JWST TSO observations</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#111",
          color: "white",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      >

        <thead style={{
            background: "#21262d",
            //position: "sticky",
            top: 0,
         }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} >
              {headerGroup.headers.map((header) => (
                <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                        cursor: "pointer",
                        padding: "8px 5px",  // top-bottom left-right
                        borderBottom: "2px solid #444444",
                        whiteSpace: "nowrap",
                    }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                   {{
                     asc: " 🔼",
                     desc: " 🔽",
                   }[header.column.getIsSorted()] ?? ""}

                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];

              return (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #222",
                    padding: "0px 5px",  // top-bottom left-right
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
              );
          })}

        </tbody>

      </table>
    </div>
  );
}

