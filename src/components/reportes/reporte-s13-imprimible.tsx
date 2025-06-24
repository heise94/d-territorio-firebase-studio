"use client";

import React from 'react';
import type { ConsolidatedS13Data } from '@/types';
import { Button } from '@/components/ui/button';

interface ReporteS13ImprimibleProps {
  data: ConsolidatedS13Data[];
  serviceYear: string;
}

// Helper to chunk array into pages
const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export function ReporteS13Imprimible({ data, serviceYear }: ReporteS13ImprimibleProps) {
  const territoriesPerPage = 20;
  const pages = chunk(data, territoriesPerPage);

  return (
    <>
      <style jsx global>{`
        /* Custom styles for page layout */
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column; /* Stacks pages vertically */
            align-items: center; /* Centers pages horizontally */
            min-height: 100vh; /* Ensures body takes full height for overall centering */
        }

        .document-page {
            background-color: #ffffff;
            padding: 30px; /* Internal padding for the content area */
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 8.5in; /* 8.5 inches wide */
            height: 11in; /* 11 inches tall */
            box-sizing: border-box; /* Include padding and border in the element's total width and height */
            margin-bottom: 20px; /* Space between pages */
            position: relative; /* For page number positioning */
            display: flex; /* To manage content layout within the page */
            flex-direction: column; /* Content inside page stacks vertically */
            page-break-after: always; /* For print purposes */
        }
        /* Last page should not have page-break-after */
        .document-page:last-of-type {
            page-break-after: avoid;
            margin-bottom: 0;
        }

        .page-number {
            position: absolute;
            bottom: 15px;
            right: 15px;
            font-size: 9pt;
            color: #6b7280;
            font-family: Arial, sans-serif;
        }

        /* Common styles for content within pages */
        .document-page h1 {
            color: black;
            font-family: Arial, sans-serif;
            font-weight: 900;
            font-size: 14pt;
            text-align: center;
            padding-top: 3pt;
            padding-left: 29pt;
            text-indent: 0pt;
            margin: 0;
        }

        .document-page h2 {
            color: black;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 10pt;
            text-align: center;
            padding-left: 29pt;
            margin-top: 5px;
            margin-bottom: 20px;
        }

        .year-section {
            display: flex;
            align-items: baseline;
            margin-left: 9.775pt;
            margin-bottom: 15pt;
            width: auto;
        }

        .year-label {
            color: black;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 12pt;
            line-height: 13pt;
            margin-right: 5pt;
        }
        .year-value {
            color: black;
            font-family: "Century Gothic", sans-serif;
            font-weight: bold;
            text-decoration: underline;
            font-size: 12pt;
            line-height: 14pt;
            border: none;
            background-color: transparent;
            width: 60px;
            text-align: left;
            padding: 0;
            outline: none;
        }

        /* Main data table styles */
        .main-table {
            border-collapse: collapse;
            width: 100%;
            margin-left: 9.775pt;
            border-top: 3pt solid black;
            border-left: 3pt solid black;
            border-bottom: 2pt solid black;
            border-right: 3pt solid black;
        }

        .main-table th, .main-table td {
            vertical-align: middle;
            padding: 0;
            box-sizing: border-box;
            white-space: nowrap;
        }

        .header-row {
            background-color: #D9D9D9;
            height: 14pt;
        }
        .header-row-sub {
            background-color: #D9D9D9;
            height: 22pt;
        }

        .header-cell {
            color: #404040;
            font-family: Arial, sans-serif;
            font-weight: normal;
            font-size: 9pt;
            line-height: normal;
            text-indent: 0;
            text-align: center;
        }
        .header-cell-small {
            color: #404040;
            font-family: Arial, sans-serif;
            font-weight: normal;
            font-size: 8pt;
            line-height: 9pt;
            text-indent: 0;
            text-align: center;
        }

        .h-num-terr {
            width: 36pt;
            border-top: 3pt solid black;
            border-left: 3pt solid black;
            border-bottom: 2pt solid black;
            border-right: 1pt solid black;
            padding-top: 8pt;
            padding-left: 3pt;
            padding-right: 1pt;
            text-indent: 3pt;
        }
        .h-last-completed {
            width: 63pt;
            border-top: 3pt solid black;
            border-left: 1pt solid black;
            border-bottom: 2pt solid black;
            border-right: 3pt solid black;
            padding-top: 3pt;
            padding-left: 13pt;
            padding-right: 3pt;
            text-indent: -5pt;
        }
        .h-assigned-to {
            width: 107pt;
            border-top: 3pt solid black;
            border-left: 3pt solid black;
            border-bottom: 1pt solid black;
            border-right: 2pt solid black;
            padding-top: 2pt;
            padding-left: 0;
        }
        .h-assigned-to-middle {
            border-left: 2pt solid black;
            border-bottom: 1pt solid black;
            border-right: 2pt solid black;
            padding-top: 2pt;
            padding-left: 0;
        }
        .h-assigned-to-last {
            border-left: 2pt solid black;
            border-bottom: 1pt solid black;
            border-right: 3pt solid black;
            padding-top: 2pt;
            padding-left: 0;
        }

        .h-assigned-date {
            width: 54pt;
            border-top: 1pt solid black;
            border-left: 3pt solid black;
            border-bottom: 2pt solid black;
            border-right: 1pt solid black;
            padding-top: 1pt;
            padding-left: 0;
            text-indent: 0;
        }
        .h-completed-date {
            width: 53pt;
            border-top: 1pt solid black;
            border-left: 1pt solid black;
            border-bottom: 2pt solid black;
            border-right: 2pt solid black;
            padding-top: 1pt;
            padding-left: 0;
            text-indent: 0;
        }
        .h-assigned-date-middle {
            border-left: 2pt solid black;
            border-right: 1pt solid black;
        }
        .h-completed-date-middle {
            border-left: 1pt solid black;
            border-right: 2pt solid black;
        }
        .h-assigned-date-last {
            border-left: 2pt solid black;
            border-right: 1pt solid black;
        }
        .h-completed-date-last {
            border-left: 1pt solid black;
            border-right: 3pt solid black;
        }

        /* Data rows styles */
        .data-cell {
            color: black;
            font-family: "Century Gothic", sans-serif;
            font-weight: normal;
            font-size: 9pt;
            text-indent: 0;
        }
        .data-cell-date-main {
            font-size: 10pt;
            line-height: normal;
        }

        .d-num-terr {
            width: 36pt;
            border-top: 2pt solid black;
            border-left: 3pt solid black;
            border-bottom: 2pt solid black;
            border-right: 1pt solid black;
            text-align: center;
            padding-top: 7pt;
        }
        .d-last-completed {
            width: 63pt;
            border-top: 2pt solid black;
            border-left: 1pt solid black;
            border-bottom: 2pt solid black;
            border-right: 3pt solid black;
            text-align: center;
            padding-top: 7pt;
            padding-left: 0;
        }
        .d-name {
            width: 107pt;
            border-top: 2pt solid black;
            border-left: 3pt solid black;
            border-bottom: 1pt solid black;
            border-right: 2pt solid black;
            padding-top: 1pt;
            padding-left: 0;
            line-height: 10pt;
            text-align: center;
        }
        .d-name-middle {
            border-left: 2pt solid black;
            border-bottom: 1pt solid black;
            border-right: 2pt solid black;
            padding-top: 1pt;
            padding-left: 0;
            line-height: 10pt;
            text-align: center;
        }
        .d-name-last {
            border-left: 2pt solid black;
            border-bottom: 1pt solid black;
            border-right: 3pt solid black;
            padding-top: 1pt;
            padding-left: 0;
            line-height: 10pt;
            text-align: center;
        }

        .d-assigned-date {
            width: 54pt;
            border-top: 1pt solid black;
            border-left: 3pt solid black;
            border-bottom: 2pt solid black;
            border-right: 1pt solid black;
            padding-top: 2pt;
            padding-left: 0;
            line-height: 10pt;
            text-align: center;
        }
        .d-completed-date {
            width: 53pt;
            border-top: 1pt solid black;
            border-left: 1pt solid black;
            border-bottom: 2pt solid black;
            border-right: 2pt solid black;
            padding-top: 2pt;
            padding-left: 0;
            line-height: 10pt;
            text-align: center;
        }
        .d-assigned-date-middle {
            border-left: 2pt solid black;
            border-right: 1pt solid black;
            padding-left: 0;
            text-align: center;
        }
        .d-completed-date-middle {
            border-left: 1pt solid black;
            border-right: 2pt solid black;
            padding-left: 0;
            text-align: center;
        }
        .d-assigned-date-last {
            border-left: 2pt solid black;
            border-right: 1pt solid black;
            padding-left: 0;
            text-align: center;
        }
        .d-completed-date-last {
            border-left: 1pt solid black;
            border-right: 3pt solid black;
            padding-left: 0;
            text-align: center;
        }

        .action-buttons-container-global {
            margin-top: 0px;
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            justify-content: center;
            width: 100%;
        }

        @media print {
            body {
                background-color: #ffffff;
                padding: 0;
            }
            .action-buttons-container-global {
                display: none;
            }
            .document-page {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
                width: 100%;
                height: auto;
            }
        }
      `}</style>
      <div className="action-buttons-container-global">
        <Button onClick={() => window.print()}>Imprimir o Guardar como PDF</Button>
      </div>

      {pages.map((pageData, pageIndex) => (
        <div key={pageIndex} className="document-page">
          <div className="header-content">
            <h1>REGISTRO DE ASIGNACIÓN DE TERRITORIO</h1>
            <h2></h2>
            <div className="year-section">
              <p className="year-label">Año de servicio:</p>
              <p className="year-value">{serviceYear}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="main-table">
              <thead>
                <tr className="header-row">
                  <th rowSpan={2} className="header-cell h-num-terr">Núm.<br /> de terr.</th>
                  <th rowSpan={2} className="header-cell h-last-completed">Última fecha<br /> en que se<br /> completó*</th>
                  <th colSpan={2} className="header-cell h-assigned-to">Asignado a</th>
                  <th colSpan={2} className="header-cell header-cell h-assigned-to-middle">Asignado a</th>
                  <th colSpan={2} className="header-cell header-cell h-assigned-to-middle">Asignado a</th>
                  <th colSpan={2} className="header-cell header-cell h-assigned-to-last">Asignado a</th>
                </tr>
                <tr className="header-row-sub">
                  <th className="header-cell-small h-assigned-date">Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small h-completed-date">Fecha en que<br /> se completó</th>
                  <th className="header-cell-small h-assigned-date h-assigned-date-middle">Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small h-completed-date h-completed-date-middle">Fecha en que<br /> se completó</th>
                  <th className="header-cell-small h-assigned-date h-assigned-date-middle">Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small h-completed-date h-completed-date-middle">Fecha en que<br /> se completó</th>
                  <th className="header-cell-small h-assigned-date h-assigned-date-last">Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small h-completed-date h-completed-date-last">Fecha en que<br /> se completó</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((territoryData) => (
                  <tr key={territoryData.territoryId}>
                    <td className="data-cell d-num-terr">{territoryData.territoryNumber}</td>
                    <td className="data-cell data-cell-date-main d-last-completed">{territoryData.penultimateCycle?.completedCurrentCycle || ''}</td>
                    
                    {/* First Cycle Column */}
                    <td className="data-cell d-name">{territoryData.lastCycle?.firstAssignedTo || ''}</td>
                    <td className="data-cell data-cell-date-main d-assigned-date">{territoryData.lastCycle?.firstAssignedDate || ''}</td>
                    <td className="data-cell data-cell-date-main d-completed-date">{territoryData.lastCycle?.completedCurrentCycle || ''}</td>

                    {/* Placeholder columns */}
                    <td className="data-cell d-name-middle"></td>
                    <td className="data-cell data-cell-date-main d-completed-date-middle"></td>
                    <td className="data-cell d-name-middle"></td>
                    <td className="data-cell data-cell-date-main d-completed-date-middle"></td>
                    <td className="data-cell d-name-last"></td>
                    <td className="data-cell data-cell-date-main d-completed-date-last"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="page-number">{pageIndex + 1} / {pages.length}</div>
        </div>
      ))}
    </>
  );
}
