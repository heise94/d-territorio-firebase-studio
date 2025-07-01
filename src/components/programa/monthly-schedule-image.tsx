
"use client";

import React, { forwardRef } from 'react';
import type { Assignment, DayOfWeek, CustomHoliday } from '@/types';
import { format, getDay, getDaysInMonth, startOfMonth, parseISO, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, MapPin, Home, Globe } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface MonthlyScheduleImageProps {
  assignments: Assignment[];
  year: number;
  month: number;
  groupOrganizedDays: DayOfWeek[];
  customHolidays: CustomHoliday[];
}

const DAY_OF_WEEK_MAP_NUM_TO_KEY: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const IconWrapper = ({ children }: { children: React.ReactNode }) => (
    <div style={{ marginRight: '6px', color: '#66bb6a', width: '18px', textAlign: 'center', flexShrink: 0, paddingTop: '2px' }}>
        {children}
    </div>
);


export const MonthlyScheduleImage = forwardRef<HTMLDivElement, MonthlyScheduleImageProps>(
  ({ assignments, year, month, groupOrganizedDays, customHolidays }, ref) => {

    const scheduleStyles = `
      body { font-family: "Inter", sans-serif; }
      .container { background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); overflow: hidden; width: 1100px; max-width: 1100px; }
      .header { background-color: #66bb6a; color: #ffffff; padding: 15px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px; }
      .header h1 { font-size: 1.6rem; font-weight: bold; margin-bottom: 3px; }
      .header h2 { font-size: 1.1rem; margin-bottom: 3px; }
      .header p { font-size: 0.85rem; }
      .month-name { font-size: 1.4rem; font-weight: bold; color: #333; text-align: center; padding: 10px 0; background-color: #f9f9f9; border-bottom: 1px solid #eee; text-transform: capitalize; }
      .calendar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 10px; }
      .day-card { background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05); padding: 10px; display: flex; flex-direction: column; min-height: 150px; }
      .day-header { background-color: #a5d6a7; color: #333; padding: 6px 10px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 8px; font-size: 0.9rem; text-transform: capitalize; }
      .holiday-header { background-color: #80deea; color: #006064; }
      .event-details { margin-bottom: 8px; }
      .event-details > div { display: flex; align-items: flex-start; margin-bottom: 3px; color: #555; font-size: 0.8rem; line-height: 1.3; }
      .event-details span { flex-grow: 1; }
      .group-day { font-weight: bold; text-align: center; color: #333; padding: 10px; }
      .holiday-text { font-weight: bold; text-align: center; color: #006064; padding: 10px; }
    `;

    const firstDayOfMonth = startOfMonth(new Date(year, month));
    const numDaysInMonth = getDaysInMonth(firstDayOfMonth);
    const calendarDays = Array.from({ length: numDaysInMonth }, (_, i) => addDays(firstDayOfMonth, i));

    const assignmentsByDay = assignments.reduce((acc, assign) => {
        const dayKey = assign.date;
        if (!acc[dayKey]) {
            acc[dayKey] = [];
        }
        acc[dayKey].push(assign);
        return acc;
    }, {} as Record<string, Assignment[]>);

    const monthName = format(firstDayOfMonth, "MMMM", { locale: es });

    return (
      <div ref={ref} style={{ position: 'absolute', left: '-9999px', backgroundColor: '#f0f0f0', padding: '10px' }}>
        <style>{scheduleStyles}</style>
        <div className="container">
            <div className="header">
                <h1>PROGRAMA DE PREDICACIÓN</h1>
                <h2>CONGREGACIÓN MAQUEHUE</h2>
                <p>{monthName.toUpperCase()} {year}</p>
            </div>
            <div className="month-name">{monthName} {year}</div>
            <div className="calendar-grid">
                {calendarDays.map(day => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayOfWeek = DAY_OF_WEEK_MAP_NUM_TO_KEY[getDay(day)];
                    const dayAssignments = (assignmentsByDay[dayKey] || []).sort((a,b) => a.time.localeCompare(b.time));
                    const isGroupDay = groupOrganizedDays.includes(dayOfWeek) && dayAssignments.length === 0;

                    const holidayForDay = customHolidays.find(h => {
                        const holidayDate = h.date instanceof Timestamp ? h.date.toDate() : new Date(h.date);
                        return isSameDay(holidayDate, day);
                    });

                    return (
                        <div key={dayKey} className="day-card">
                            <div className={`day-header ${holidayForDay ? 'holiday-header' : ''}`}>{format(day, "EEEE dd", { locale: es })}{holidayForDay ? ` (${holidayForDay.name})` : ''}</div>
                            {dayAssignments.length > 0 ? (
                                dayAssignments.map(assign => (
                                    <div key={assign.id} className="event-details">
                                        <div><IconWrapper><Clock size={12} /></IconWrapper> <span>{assign.time} - {assign.type === 'rural' ? 'Predicación Rural' : 'Predicación General'}</span></div>
                                        <div><IconWrapper><User size={12} /></IconWrapper> <span>{assign.userName}</span></div>
                                        <div><IconWrapper><Home size={12} /></IconWrapper> <span>{assign.casaName || 'No especificada'}</span></div>
                                        <div><IconWrapper><Globe size={12} /></IconWrapper> <span>Territorio: {assign.locationName}</span></div>
                                    </div>
                                ))
                            ) : holidayForDay ? (
                                <div className="holiday-text">{holidayForDay.name}</div>
                            ) : isGroupDay ? (
                                <div className="group-day">Predicación por Grupo</div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    );
  }
);

MonthlyScheduleImage.displayName = 'MonthlyScheduleImage';
