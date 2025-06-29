
"use client";

import React, { forwardRef } from 'react';
import type { Assignment, PreachingAssignedType } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, MountainSnow, Video, MapPin, User, Home } from 'lucide-react';

interface WeeklyScheduleImageProps {
  weekDays: Date[];
  assignments: Assignment[];
  weekTitle: string;
}

const PreachingTypeIcon = ({ type }: { type: PreachingAssignedType }) => {
    const iconStyle: React.CSSProperties = {
        width: '14px',
        height: '14px',
        marginRight: '6px',
        verticalAlign: 'middle',
        color: '#34D399', // primary color
    };
    if (type === "publica") return <Users style={iconStyle} />;
    if (type === "rural") return <MountainSnow style={iconStyle} />;
    if (type === "zoom") return <Video style={iconStyle} />;
    return null;
};

export const WeeklyScheduleImage = forwardRef<HTMLDivElement, WeeklyScheduleImageProps>(
  ({ weekDays, assignments, weekTitle }, ref) => {

    const scheduleStyles = `
      .schedule-container {
        font-family: Arial, sans-serif;
        color: #333;
        width: 800px;
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
      }
      .schedule-header {
        text-align: center;
        margin-bottom: 24px;
      }
      .schedule-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #10b981;
        margin: 0;
      }
      .schedule-header p {
        font-size: 16px;
        color: #4b5563;
        margin-top: 4px;
      }
      .schedule-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
      .day-column {
        background-color: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        padding: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .day-header {
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        padding-bottom: 8px;
        border-bottom: 1px solid #f3f4f6;
        margin-bottom: 8px;
        text-transform: capitalize;
      }
      .day-assignments {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .assignment-card {
        border-left: 4px solid #34D399;
        padding: 8px 12px;
        background-color: #f0fdf4;
        border-radius: 6px;
      }
      .assignment-time {
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
      }
      .assignment-location {
        font-size: 13px;
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 2px;
        display: flex;
        align-items: center;
      }
       .assignment-captain {
        font-size: 12px;
        color: #4b5563;
        display: flex;
        align-items: center;
      }
      .assignment-casa {
        font-size: 12px;
        color: #6b7280;
        display: flex;
        align-items: center;
        margin-top: 2px;
      }
      .icon-style {
        width: 12px;
        height: 12px;
        margin-right: 5px;
        color: #6b7280;
      }
      .no-assignments {
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
        padding: 20px 0;
      }
    `;
    
    // Group assignments by day string "yyyy-MM-dd"
    const assignmentsByDay = assignments.reduce((acc, assign) => {
        const dayKey = format(parseISO(assign.date), "yyyy-MM-dd");
        if (!acc[dayKey]) {
            acc[dayKey] = [];
        }
        acc[dayKey].push(assign);
        return acc;
    }, {} as Record<string, Assignment[]>);


    return (
      <div ref={ref} style={{ position: 'absolute', left: '-9999px' }}>
        <style>{scheduleStyles}</style>
        <div className="schedule-container">
          <div className="schedule-header">
            <h1>Programa de Predicación</h1>
            <p>{weekTitle}</p>
          </div>
          <div className="schedule-grid">
            {weekDays.map(day => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayAssignments = (assignmentsByDay[dayKey] || []).filter(a => a.status === 'accepted').sort((a,b) => a.time.localeCompare(b.time));
                return (
                    <div key={day.toISOString()} className="day-column">
                    <div className="day-header">{format(day, "EEEE, d", { locale: es })}</div>
                    <div className="day-assignments">
                        {dayAssignments.length > 0 ? (
                        dayAssignments.map(assign => (
                            <div key={assign.id} className="assignment-card">
                                <div className="assignment-time">
                                    <PreachingTypeIcon type={assign.type} />
                                    {assign.time}
                                </div>
                                <div className="assignment-location">
                                    <MapPin className="icon-style" /> {assign.locationName}
                                </div>
                                 <div className="assignment-captain">
                                    <User className="icon-style" /> {assign.userName}
                                </div>
                                {assign.casaName && (
                                     <div className="assignment-casa">
                                        <Home className="icon-style" /> {assign.casaName}
                                    </div>
                                )}
                            </div>
                        ))
                        ) : (
                        <div className="no-assignments">Sin asignaciones</div>
                        )}
                    </div>
                    </div>
                );
            })}
          </div>
        </div>
      </div>
    );
  }
);

WeeklyScheduleImage.displayName = 'WeeklyScheduleImage';
