
"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReporteS13Imprimible, type PrintableS13TerritoryData } from '@/components/reportes/reporte-s13-imprimible';
import type { Assignment, Territory } from '@/types';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';

function PrintableS13PageContent() {
    const searchParams = useSearchParams();
    const serviceYear = searchParams.get('serviceYear');

    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
    const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const unsubAssignments = onSnapshot(collection(db, "assignments"), (snapshot) => {
            setAllAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        });

        const unsubTerritories = onSnapshot(collection(db, "territories"), (snapshot) => {
            setAllTerritories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Territory)));
        });

        const timer = setTimeout(() => setIsLoading(false), 2000);

        return () => {
            unsubAssignments();
            unsubTerritories();
            clearTimeout(timer);
        };
    }, []);

    const processedData = useMemo((): PrintableS13TerritoryData[] => {
        if (!serviceYear || allAssignments.length === 0 || allTerritories.length === 0) {
            return [];
        }

        const year = parseInt(serviceYear, 10);
        const serviceYearStart = new Date(year, 8, 1); // September 1st
        const serviceYearEnd = new Date(year + 1, 8, 1); // September 1st of next year (exclusive)

        const finalReportData: PrintableS13TerritoryData[] = [];

        for (const territory of allTerritories) {
            if (!territory.totalBlocks || territory.totalBlocks === 0) continue;

            const allAssignmentsForTerritory = allAssignments
                .filter(a => a.locationId === territory.id && a.lastReportData?.reportedAt)
                .sort((a, b) => (a.createdAt as Timestamp).toMillis() - (b.createdAt as Timestamp).toMillis());
            
            if (allAssignmentsForTerritory.length === 0) continue;
            
            const allCompletedCycles: any[] = [];
            let tempWorkedBlocks = new Set<number>();
            let cycleStartIndex = 0;

            for (let i = 0; i < allAssignmentsForTerritory.length; i++) {
                const assignment = allAssignmentsForTerritory[i];
                if (!assignment.lastReportData) continue;
                
                const report = assignment.lastReportData.reports.find(r => r.territoryId === territory.id);
                if (report && !report.territoryNotWorked) {
                    (report.workedBlocksIds || []).forEach(id => {
                        const blockNum = parseInt(id.split('-').pop()!, 10);
                        if (!isNaN(blockNum)) tempWorkedBlocks.add(blockNum);
                    });
                }

                if (tempWorkedBlocks.size >= (territory.totalBlocks || 1)) {
                    const completionDate = (assignment.lastReportData.reportedAt as Timestamp).toDate();
                    const startAssignment = allAssignmentsForTerritory[cycleStartIndex];
                    
                    allCompletedCycles.push({
                        assignedTo: startAssignment.userName || 'N/A',
                        assignedDate: format(parseISO(startAssignment.date), 'dd/MM/yy'),
                        completedDate: format(completionDate, 'dd/MM/yy'),
                        completionTimestamp: completionDate.getTime(),
                        startAssignmentId: startAssignment.id 
                    });
                    
                    tempWorkedBlocks.clear();
                    // Important: The next cycle starts *after* the assignment that completed the current one.
                    cycleStartIndex = i + 1; 
                }
            }
            
            const cyclesInSelectedYear = allCompletedCycles.filter(
                c => c.completionTimestamp >= serviceYearStart.getTime() && c.completionTimestamp < serviceYearEnd.getTime()
            );
            
            if (cyclesInSelectedYear.length === 0) continue;

            let lastCompletedBeforeDate = '';
            const firstCycleInYear = cyclesInSelectedYear[0];
            const indexOfFirstCycleInAll = allCompletedCycles.findIndex(c => 
                c.startAssignmentId === firstCycleInYear.startAssignmentId && 
                c.completionTimestamp === firstCycleInYear.completionTimestamp
            );

            if (indexOfFirstCycleInAll > 0) {
                lastCompletedBeforeDate = allCompletedCycles[indexOfFirstCycleInAll - 1].completedDate;
            }
            
            finalReportData.push({
                territoryId: territory.id,
                territoryNumber: territory.number || territory.name,
                lastCompletedBeforeDate: lastCompletedBeforeDate,
                cyclesInYear: cyclesInSelectedYear,
            });
        }
        
        return finalReportData.sort((a, b) => (a.territoryNumber || "").localeCompare(b.territoryNumber || "", undefined, { numeric: true }));

    }, [serviceYear, allAssignments, allTerritories]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Cargando datos para el reporte...</p>
            </div>
        );
    }
    
    if (!serviceYear) {
         return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
                <p className="text-destructive">No se ha especificado un año de servicio.</p>
            </div>
        );
    }

    return <ReporteS13Imprimible data={processedData} serviceYear={serviceYear} />;
}

export default function PrintableS13Page() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <PrintableS13PageContent />
        </Suspense>
    );
}
