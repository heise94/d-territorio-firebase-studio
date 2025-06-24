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
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        .document-page {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 8.5in;
            height: 11in;
            box-sizing: border-box;
            margin-bottom: 20px;
            position: relative;
            display: flex;
            flex-direction: column;
            page-break-after: always;
        }
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
        }
        
        .header-content h1 {
            color: black; font-family: Arial, sans-serif; font-weight: 900;
            font-size: 14pt; text-align: center; padding-top: 3pt;
            padding-left: 29pt; text-indent: 0pt; margin: 0;
        }
        .header-content h2 {
            color: black; font-family: Arial, sans-serif; font-weight: bold;
            font-size: 10pt; text-align: center; padding-left: 29pt;
            margin-top: 5px; margin-bottom: 20px;
        }
        .year-section {
            display: flex; align-items: baseline; margin-left: 9.775pt;
            margin-bottom: 15pt; width: auto;
        }
        .year-label {
            color: black; font-family: Arial, sans-serif; font-weight: bold;
            font-size: 12pt; line-height: 13pt; margin-right: 5pt;
        }
        .year-value {
            color: black; font-family: "Century Gothic", sans-serif; font-weight: bold;
            text-decoration: underline; font-size: 12pt; line-height: 14pt;
            border: none; background-color: transparent; width: 60px;
            text-align: left; padding: 0; outline: none;
        }

        .main-table {
            border-collapse: collapse; width: 100%; margin-left: 9.775pt;
            border-top: 3pt solid black; border-left: 3pt solid black;
            border-bottom: 2pt solid black; border-right: 3pt solid black;
        }
        .main-table th, .main-table td {
            vertical-align: middle; padding: 0; box-sizing: border-box; white-space: nowrap;
        }
        .header-row, .header-row-sub { background-color: #D9D9D9; }
        .header-row { height: 14pt; } .header-row-sub { height: 22pt; }
        .header-cell { color: #404040; font-family: Arial, sans-serif; font-weight: normal; font-size: 9pt; line-height: normal; text-align: center; }
        .header-cell-small { font-size: 8pt; line-height: 9pt; }

        .data-cell {
            color: black; font-family: "Century Gothic", sans-serif;
            font-weight: normal; font-size: 9pt; text-align: center;
        }
        .data-cell-date-main { font-size: 10pt; }

        .d-num-terr, .d-last-completed, .d-name, .d-assigned-date, .d-completed-date {
            border-top: 2pt solid black;
            border-bottom: 2pt solid black;
        }
        .d-num-terr { border-left: 3pt solid black; border-right: 1pt solid black; width: 36pt; padding-top: 7pt; }
        .d-last-completed { border-left: 1pt solid black; border-right: 3pt solid black; width: 63pt; padding-top: 7pt; }

        /* Cycle columns styling */
        .d-cycle-col-name { border-top: 2pt solid black; border-bottom: 1pt solid black; width: 107pt; line-height: 10pt; padding-top: 1pt;}
        .d-cycle-col-assigned { border-top: 1pt solid black; border-bottom: 2pt solid black; width: 54pt; line-height: 10pt; padding-top: 2pt;}
        .d-cycle-col-completed { border-top: 1pt solid black; border-bottom: 2pt solid black; width: 53pt; line-height: 10pt; padding-top: 2pt;}

        .first-cycle .d-cycle-col-name, .first-cycle .d-cycle-col-assigned { border-left: 3pt solid black; }
        .first-cycle .d-cycle-col-completed, .d-cycle-col-name { border-right: 2pt solid black; }
        .d-cycle-col-assigned { border-right: 1pt solid black; }
        
        .middle-cycle .d-cycle-col-name, .middle-cycle .d-cycle-col-assigned, .middle-cycle .d-cycle-col-completed { border-left: 2pt solid black; }
        .last-cycle .d-cycle-col-name, .last-cycle .d-cycle-col-assigned { border-left: 2pt solid black; border-right: 1pt solid black; }
        .last-cycle .d-cycle-col-completed { border-left: 1pt solid black; border-right: 3pt solid black; }

        .action-buttons-container-global {
            margin-bottom: 20px;
            display: flex; gap: 15px; justify-content: center; width: 100%;
        }

        @media print {
            body { background-color: #ffffff; padding: 0; }
            .action-buttons-container-global { display: none; }
            .document-page { box-shadow: none; border-radius: 0; margin: 0; width: 100%; height: auto; }
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
                  <th rowSpan={2} className="header-cell" style={{width: '36pt', borderRight: '1pt solid black'}}>Núm.<br /> de terr.</th>
                  <th rowSpan={2} className="header-cell" style={{width: '63pt', borderRight: '3pt solid black'}}>Última fecha<br /> en que se<br /> completó*</th>
                  <th colSpan={2} className="header-cell" style={{borderRight: '2pt solid black'}}>Asignado a</th>
                  <th colSpan={2} className="header-cell" style={{borderRight: '2pt solid black'}}>Asignado a</th>
                  <th colSpan={2} className="header-cell" style={{borderRight: '2pt solid black'}}>Asignado a</th>
                  <th colSpan={2} className="header-cell">Asignado a</th>
                </tr>
                <tr className="header-row-sub">
                  <th className="header-cell-small" style={{width: '54pt', borderTop: '1pt solid black', borderRight: '1pt solid black'}}>Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small" style={{width: '53pt', borderTop: '1pt solid black', borderRight: '2pt solid black'}}>Fecha en que<br /> se completó</th>
                  <th className="header-cell-small" style={{width: '54pt', borderTop: '1pt solid black', borderRight: '1pt solid black'}}>Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small" style={{width: '53pt', borderTop: '1pt solid black', borderRight: '2pt solid black'}}>Fecha en que<br /> se completó</th>
                  <th className="header-cell-small" style={{width: '54pt', borderTop: '1pt solid black', borderRight: '1pt solid black'}}>Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small" style={{width: '53pt', borderTop: '1pt solid black', borderRight: '2pt solid black'}}>Fecha en que<br /> se completó</th>
                  <th className="header-cell-small" style={{width: '54pt', borderTop: '1pt solid black', borderRight: '1pt solid black'}}>Fecha en que<br /> se asignó</th>
                  <th className="header-cell-small" style={{width: '53pt', borderTop: '1pt solid black'}}>Fecha en que<br /> se completó</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((territoryData) => (
                  <tr key={territoryData.territoryId}>
                    <td className="data-cell d-num-terr">{territoryData.territoryNumber}</td>
                    <td className="data-cell data-cell-date-main d-last-completed">{territoryData.penultimateCycle?.completedCurrentCycle || ''}</td>
                    
                    {/* First Cycle Column */}
                    <td className="data-cell d-cycle-col-name first-cycle">{territoryData.lastCycle?.firstAssignedTo || ''}</td>
                    <td className="data-cell data-cell-date-main d-cycle-col-assigned first-cycle">{territoryData.lastCycle?.firstAssignedDate || ''}</td>
                    <td className="data-cell data-cell-date-main d-cycle-col-completed first-cycle">{territoryData.lastCycle?.completedCurrentCycle || ''}</td>

                    {/* Placeholder columns */}
                    <td className="data-cell d-cycle-col-name middle-cycle"></td>
                    <td className="data-cell data-cell-date-main d-cycle-col-completed middle-cycle"></td>
                    <td className="data-cell d-cycle-col-name middle-cycle"></td>
                    <td className="data-cell data-cell-date-main d-cycle-col-completed middle-cycle"></td>
                    <td className="data-cell d-cycle-col-name last-cycle"></td>
                    <td className="data-cell data-cell-date-main d-cycle-col-completed last-cycle"></td>
                  </tr>
                ))}
                 {Array.from({ length: territoriesPerPage - pageData.length }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                        <td className="data-cell d-num-terr">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-last-completed">&nbsp;</td>
                        <td className="data-cell d-cycle-col-name first-cycle">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-cycle-col-assigned first-cycle">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-cycle-col-completed first-cycle">&nbsp;</td>
                        <td className="data-cell d-cycle-col-name middle-cycle">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-cycle-col-completed middle-cycle">&nbsp;</td>
                        <td className="data-cell d-cycle-col-name middle-cycle">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-cycle-col-completed middle-cycle">&nbsp;</td>
                        <td className="data-cell d-cycle-col-name last-cycle">&nbsp;</td>
                        <td className="data-cell data-cell-date-main d-cycle-col-completed last-cycle">&nbsp;</td>
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
