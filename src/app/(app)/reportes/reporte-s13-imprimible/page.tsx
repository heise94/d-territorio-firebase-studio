
"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReporteS13Imprimible, type PrintableS13TerritoryData } from '@/components/reportes/reporte-s13-imprimible';
import type { Assignment, Territory } from '@/types';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parse } from 'date-fns';
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

        const finalReportData: PrintableS13TerritoryData[] = [];

        for (const territory of allTerritories) {
            if (!territory.totalBlocks || territory.totalBlocks === 0) continue;

            const allReportsForTerritory = allAssignments
                .filter(a => a.locationId === territory.id && a.lastReportData?.reportedAt)
                .sort((a, b) => (a.lastReportData!.reportedAt as Timestamp).toMillis() - (b.lastReportData!.reportedAt as Timestamp).toMillis());

            if (allReportsForTerritory.length === 0) continue;

            const allHistoricalCycles: any[] = [];
            let blocksForCurrentCycle = new Set<number>();
            let startOfCurrentCycleIndex = 0;

            for (let i = 0; i < allReportsForTerritory.length; i++) {
                const assignment = allReportsForTerritory[i];
                const report = assignment.lastReportData!.reports.find(r => r.territoryId === territory.id);

                if (report && !report.territoryNotWorked) {
                    (report.workedBlocksIds || []).forEach(id => {
                        const blockNum = parseInt(id.split('-').pop()!, 10);
                        if (!isNaN(blockNum)) blocksForCurrentCycle.add(blockNum);
                    });
                }

                if (blocksForCurrentCycle.size >= territory.totalBlocks) {
                    const completionDate = (assignment.lastReportData!.reportedAt as Timestamp).toDate();
                    const startAssignment = allReportsForTerritory[startOfCurrentCycleIndex];
                    
                    allHistoricalCycles.push({
                        assignedTo: startAssignment.userName || 'N/A',
                        assignedDate: format(parse(startAssignment.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yy'),
                        completedDate: format(completionDate, 'dd/MM/yy'),
                        completionTimestamp: completionDate.getTime()
                    });

                    blocksForCurrentCycle.clear();
                    startOfCurrentCycleIndex = i + 1;
                }
            }

            if (allHistoricalCycles.length === 0) continue;
            
            const year = parseInt(serviceYear, 10);
            const serviceYearStart = new Date(year, 8, 1);
            const serviceYearEnd = new Date(year + 1, 8, 1);

            const cyclesInYear = allHistoricalCycles.filter(
                c => c.completionTimestamp >= serviceYearStart.getTime() && c.completionTimestamp < serviceYearEnd.getTime()
            );

            if (cyclesInYear.length === 0) continue;

            let lastCompletedDateBefore = '';
            const firstCycleTimestampInYear = cyclesInYear[0].completionTimestamp;
            
            const cyclesBeforeThisYear = allHistoricalCycles.filter(
                c => c.completionTimestamp < firstCycleTimestampInYear
            );
            
            if (cyclesBeforeThisYear.length > 0) {
                lastCompletedDateBefore = cyclesBeforeThisYear[cyclesBeforeThisYear.length - 1].completedDate;
            }
            
            finalReportData.push({
                territoryId: territory.id,
                territoryNumber: territory.number || territory.name,
                lastCompletedBeforeDate: lastCompletedDateBefore,
                cyclesInYear: cyclesInYear,
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
