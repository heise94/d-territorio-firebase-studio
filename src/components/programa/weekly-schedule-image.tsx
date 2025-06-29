
"use client";

import React, { forwardRef } from 'react';
import type { Assignment, PreachingAssignedType, DayOfWeek } from '@/types';
import { format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyScheduleImageProps {
  weekDays: Date[];
  assignments: Assignment[];
  weekTitle: string;
  groupOrganizedDays: DayOfWeek[];
}

const DAY_OF_WEEK_MAP_NUM_TO_KEY: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

export const WeeklyScheduleImage = forwardRef<HTMLDivElement, WeeklyScheduleImageProps>(
  ({ weekDays, assignments, weekTitle, groupOrganizedDays }, ref) => {

    const scheduleStyles = `
      body {
          font-family: 'Inter', sans-serif;
      }
      .container {
          background-color: #ffffff;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          width: 600px;
          overflow: hidden;
      }
      .header {
          background-color: #2ECC71;
          color: white;
          padding: 25px 20px;
          text-align: center;
      }
      .header-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .header-subtitle {
        font-size: 14px;
      }
      .day-card {
          background-color: #ffffff;
          margin: 0 20px 20px 20px;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      .day-card.first {
          margin-top: 20px;
      }
      .day-label {
          background-color: #D1FAE5;
          color: #10B981;
          padding: 8px 15px;
          border-radius: 8px;
          font-weight: 600;
          margin-bottom: 15px;
          display: inline-block;
          text-transform: capitalize;
      }
      .event-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 0;
          border-bottom: 1px solid #edf2f7;
      }
      .event-item:last-child {
          border-bottom: none;
      }
      .event-time-type {
          flex-grow: 1;
      }
      .event-details {
          text-align: right;
          margin-left: 10px;
          flex-shrink: 0;
      }
      .event-title {
          font-weight: 600;
          color: #333;
      }
      .event-subtitle {
          font-size: 0.9em;
          color: #555;
          margin-top: 2px;
      }
      .event-person {
          font-weight: 500;
          color: #2563EB; /* Azul */
      }
      .event-territory {
          font-size: 0.85em;
          color: #666;
          margin-top: 2px;
      }
      .group-service-event {
          text-align: center;
          font-weight: 600;
          color: #444;
          padding: 10px 0;
      }
      .no-assignments {
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
        padding: 20px 0;
      }
    `;
    
    const assignmentsByDay = assignments.reduce((acc, assign) => {
        const dayKey = format(parseISO(assign.date), "yyyy-MM-dd");
        if (assign.status === 'accepted') {
          if (!acc[dayKey]) {
              acc[dayKey] = [];
          }
          acc[dayKey].push(assign);
        }
        return acc;
    }, {} as Record<string, Assignment[]>);


    return (
      <div ref={ref} style={{ position: 'absolute', left: '-9999px', backgroundColor: '#f0f2f5', padding: '20px' }}>
        <style>{scheduleStyles}</style>
        <div className="container">
          <div className="header">
            <h1 className="header-title">PROGRAMA DE PREDICACIÓN</h1>
            <p className="header-subtitle">CONGREGACIÓN MAQUEHUE</p>
            <p className="header-subtitle">{weekTitle.toUpperCase()}</p>
          </div>
          
          {weekDays.map((day, index) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayAssignments = (assignmentsByDay[dayKey] || []).sort((a,b) => a.time.localeCompare(b.time));
            const dayOfWeek = DAY_OF_WEEK_MAP_NUM_TO_KEY[getDay(day)];
            const isGroupDay = groupOrganizedDays.includes(dayOfWeek);
            const inPersonAssignments = dayAssignments.filter(a => a.type !== 'zoom');
            const zoomAssignments = dayAssignments.filter(a => a.type === 'zoom');
            
            return (
              <div key={day.toISOString()} className={`day-card ${index === 0 ? 'first' : ''}`}>
                <div className="day-label">{format(day, "EEEE dd", { locale: es })}</div>
                {zoomAssignments.map(assign => (
                    <div key={assign.id} className="event-item">
                        <div className="event-time-type">
                            <p className="event-title">{assign.time} - Predicación por Zoom</p>
                        </div>
                        <div className="event-details">
                            <p className="event-subtitle">Encargado: <span className="event-person">{assign.userName}</span></p>
                        </div>
                    </div>
                ))}
                {inPersonAssignments.map(assign => (
                    <div key={assign.id} className="event-item">
                        <div className="event-time-type">
                            <p className="event-title">{assign.time} - {assign.type === 'rural' ? 'Predicación General Rural' : 'Predicación General'}</p>
                            <p className="event-subtitle">Lugar de encuentro: {assign.casaName || 'No especificado'}</p>
                            <p className="event-subtitle">Dirección: {assign.casaAddress || 'No especificada'}</p>
                        </div>
                        <div className="event-details">
                            <p className="event-subtitle">Encargado: <span className="event-person">{assign.userName}</span></p>
                            <p className="event-territory">Territorio: {assign.locationName}</p>
                        </div>
                    </div>
                ))}
                {isGroupDay && inPersonAssignments.length === 0 && (
                    <div className="group-service-event">Predicación por Grupos de Servicio</div>
                )}
                {!isGroupDay && dayAssignments.length === 0 && (
                    <div className="no-assignments">Sin asignaciones programadas</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

WeeklyScheduleImage.displayName = 'WeeklyScheduleImage';
