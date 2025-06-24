
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

export interface PrintableS13TerritoryData {
  territoryId: string;
  territoryNumber: string;
  lastCompletedBeforeDate: string;
  cyclesInYear: Array<{
    assignedTo: string;
    assignedDate: string;
    completedDate: string;
  }>;
}

interface ReporteS13ImprimibleProps {
  data: PrintableS13TerritoryData[];
  serviceYear: string;
}

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export function ReporteS13Imprimible({ data, serviceYear }: ReporteS13ImprimibleProps) {
  const territoriesPerPage = 20;
  const pages = chunk(data, territoriesPerPage);

  const tableBodyContent = (pageData: PrintableS13TerritoryData[]) => {
    const rows: React.ReactNode[] = [];
    pageData.forEach((territoryData) => {
      const cycles = territoryData.cyclesInYear.slice(0, 4);

      const cycleNameCells = [];
      for (let i = 0; i < 4; i++) {
        const cycle = cycles[i];
        let nameCellClass = 'data-cell d-name';
        if (i === 0) nameCellClass += ' first-cycle';
        else if (i === 3) nameCellClass += ' d-name-last';
        else nameCellClass += ' d-name-middle';

        cycleNameCells.push(
          <td key={`name-${i}`} colSpan={2} className={nameCellClass}>{cycle?.assignedTo || ''}</td>
        );
      }
      
      const cycleDateCells = [];
      for (let i = 0; i < 4; i++) {
        const cycle = cycles[i];
        let assignedDateClass = 'data-cell data-cell-date-main d-assigned-date';
        let completedDateClass = 'data-cell data-cell-date-main d-completed-date';

        if (i === 0) { // First cycle
            assignedDateClass += ' first-cycle';
            completedDateClass += ' first-cycle';
        } else if (i === 3) { // Last cycle column
            assignedDateClass += ' d-assigned-date-last';
            completedDateClass += ' d-completed-date-last';
        } else { // Middle cycles
             assignedDateClass += ' d-assigned-date-middle';
             completedDateClass += ' d-completed-date-middle';
        }

        cycleDateCells.push(
          <React.Fragment key={`dates-${i}`}>
            <td className={assignedDateClass}>{cycle?.assignedDate || ''}</td>
            <td className={completedDateClass}>{cycle?.completedDate || ''}</td>
          </React.Fragment>
        );
      }

      rows.push(
        <React.Fragment key={`${territoryData.territoryId}-row`}>
          <tr>
            <td rowSpan={2} className="data-cell d-num-terr">{territoryData.territoryNumber}</td>
            <td rowSpan={2} className="data-cell data-cell-date-main d-last-completed">{territoryData.lastCompletedBeforeDate}</td>
            {cycleNameCells}
          </tr>
          <tr>
            {cycleDateCells}
          </tr>
        </React.Fragment>
      );
    });

     const emptyRowCount = territoriesPerPage - pageData.length;
     for (let i = 0; i < emptyRowCount; i++) {
        rows.push(
            <React.Fragment key={`empty-row-${i}`}>
                <tr>
                    <td rowSpan={2} className="data-cell d-num-terr">&nbsp;</td>
                    <td rowSpan={2} className="data-cell data-cell-date-main d-last-completed">&nbsp;</td>
                    <td colSpan={2} className="data-cell d-name first-cycle">&nbsp;</td>
                    <td colSpan={2} className="data-cell d-name-middle">&nbsp;</td>
                    <td colSpan={2} className="data-cell d-name-middle">&nbsp;</td>
                    <td colSpan={2} className="data-cell d-name-last">&nbsp;</td>
                </tr>
                <tr>
                    <td className="data-cell data-cell-date-main d-assigned-date first-cycle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-completed-date first-cycle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-assigned-date-middle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-completed-date-middle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-assigned-date-middle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-completed-date-middle">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-assigned-date-last">&nbsp;</td>
                    <td className="data-cell data-cell-date-main d-completed-date-last">&nbsp;</td>
                </tr>
            </React.Fragment>
        );
     }
    return rows;
  };

  return (
    <>
      <style jsx global>{`
        body { font-family: 'Arial', sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        .document-page { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); width: 8.5in; height: 11in; box-sizing: border-box; margin-bottom: 20px; position: relative; display: flex; flex-direction: column; page-break-after: always; }
        .document-page:last-of-type { page-break-after: avoid; margin-bottom: 0; }
        .page-number { position: absolute; bottom: 15px; right: 15px; font-size: 9pt; color: #6b7280; }
        h1 { color: black; font-family: Arial, sans-serif; font-weight: 900; font-size: 14pt; text-align: center; padding-top: 3pt; margin: 0; }
        h2 { color: black; font-family: Arial, sans-serif; font-weight: bold; font-size: 10pt; text-align: center; margin-top: 5px; margin-bottom: 20px; }
        .year-section { display: flex; align-items: baseline; margin-left: 9.775pt; margin-bottom: 15pt; width: auto; }
        .year-label { color: black; font-family: Arial, sans-serif; font-weight: bold; font-size: 12pt; line-height: 13pt; margin-right: 5pt; }
        .year-value { color: black; font-family: "Century Gothic", sans-serif; font-weight: bold; text-decoration: underline; font-size: 12pt; line-height: 14pt; border: none; background-color: transparent; width: 60px; text-align: left; padding: 0; outline: none; }
        .main-table { border-collapse: collapse; width: 100%; margin-left: 9.775pt; border-top: 3pt solid black; border-left: 3pt solid black; border-bottom: 2pt solid black; border-right: 3pt solid black; }
        .main-table th, .main-table td { vertical-align: middle; padding: 0; box-sizing: border-box; white-space: nowrap; }
        .header-row, .header-row-sub { background-color: #D9D9D9; }
        .header-row { height: 14pt; } .header-row-sub { height: 22pt; }
        .header-cell { color: #404040; font-family: Arial, sans-serif; font-weight: normal; font-size: 9pt; line-height: normal; text-align: center; }
        .header-cell-small { font-size: 8pt; line-height: 9pt; }
        .data-cell { color: black; font-family: "Century Gothic", sans-serif; font-weight: normal; font-size: 9pt; text-align: center; }
        .data-cell-date-main { font-size: 10pt; }
        .d-num-terr { border-right: 1pt solid black; width: 36pt; padding-top: 7pt; border-bottom: 2pt solid black; }
        .d-last-completed { border-left: 1pt solid black; border-right: 3pt solid black; width: 63pt; padding-top: 7pt; border-bottom: 2pt solid black;}
        .d-name { border-top: 2pt solid black; border-bottom: 1pt solid black; padding-top: 1pt; line-height: 10pt; }
        .first-cycle { border-right: 2pt solid black; }
        .d-name-middle { border-left: 2pt solid black; border-right: 2pt solid black; }
        .d-name-last { border-left: 2pt solid black; }
        .d-assigned-date { border-top: 1pt solid black; border-bottom: 2pt solid black; padding-top: 2pt; line-height: 10pt; }
        .d-completed-date { border-top: 1pt solid black; border-bottom: 2pt solid black; padding-top: 2pt; line-height: 10pt; }
        .d-assigned-date.first-cycle { border-right: 1pt solid black; }
        .d-completed-date.first-cycle { border-left: 1pt solid black; border-right: 2pt solid black; }
        .d-assigned-date-middle { border-left: 2pt solid black; border-right: 1pt solid black; }
        .d-completed-date-middle { border-left: 1pt solid black; border-right: 2pt solid black; }
        .d-assigned-date-last { border-left: 2pt solid black; border-right: 1pt solid black; }
        .d-completed-date-last { border-left: 1pt solid black; }
        .action-buttons-container-global { margin-bottom: 20px; display: flex; gap: 15px; justify-content: center; width: 100%; }
        @media print { body { background-color: #ffffff; padding: 0; } .action-buttons-container-global { display: none; } .document-page { box-shadow: none; border-radius: 0; margin: 0; width: 100%; height: auto; } }
      `}</style>
      <div className="action-buttons-container-global">
        <Button onClick={() => window.print()}>Imprimir o Guardar como PDF</Button>
      </div>

      {pages.length > 0 ? pages.map((pageData, pageIndex) => (
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
                {tableBodyContent(pageData)}
              </tbody>
            </table>
          </div>
          <div className="page-number">{pageIndex + 1} / {pages.length}</div>
        </div>
      )) : (
        <div className="document-page">
          <div className="header-content">
            <h1>REGISTRO DE ASIGNACIÓN DE TERRITORIO</h1>
            <h2></h2>
            <div className="year-section">
              <p className="year-label">Año de servicio:</p>
              <p className="year-value">{serviceYear}</p>
            </div>
          </div>
          <div className="text-center py-10 text-muted-foreground">
            No hay datos de ciclos completados para el año de servicio {serviceYear}.
          </div>
        </div>
      )}
    </>
  );
}
