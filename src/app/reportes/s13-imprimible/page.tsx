
"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReporteS13Imprimible } from '@/components/reportes/reporte-s13-imprimible';
import type { Assignment, ConsolidatedS13Data, ReporteS13Data, Territory } from '@/types';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parse, parseISO, startOfDay } from 'date-fns';
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

    const processedData = useMemo((): ConsolidatedS13Data[] => {
        if (!serviceYear || allAssignments.length === 0 || allTerritories.length === 0) {
            return [];
        }

        const year = parseInt(serviceYear, 10);
        const serviceYearStart = new Date(year, 8, 1); // September 1st
        const serviceYearEnd = new Date(year + 1, 7, 31, 23, 59, 59); // August 31st

        const s13Data: ConsolidatedS13Data[] = [];

        for (const territory of allTerritories) {
            if (!territory.totalBlocks || territory.totalBlocks === 0) continue;

            const assignmentsWithReports = allAssignments
                .filter(a => a.locationId === territory.id && a.lastReportData?.reportedAt)
                .sort((a, b) => (a.lastReportData!.reportedAt as Timestamp).toMillis() - (b.lastReportData!.reportedAt as Timestamp).toMillis());

            if (assignmentsWithReports.length === 0) continue;

            let completedCyclesInServiceYear: any[] = [];
            let currentCycleWorkedBlocks = new Set<number>();
            let currentCycleStartAssignment: Assignment | null = null;
            let lastCycleCompletionDate: Date | null = null;
            
            const allAssignmentsForTerritory = allAssignments
                .filter(a => a.locationId === territory.id)
                .sort((a, b) => (a.createdAt as Timestamp).toMillis() - (b.createdAt as Timestamp).toMillis());
                
            let penultimateCycleCompletionDate: Date | null = null;
            let lastCompletionDate: Date | null = null;
            
            let tempWorkedBlocks = new Set<number>();
            let cycleStartIndex = 0;

            for (let i = 0; i < allAssignmentsForTerritory.length; i++) {
                const assignment = allAssignmentsForTerritory[i];
                if (assignment.lastReportData) {
                    const report = assignment.lastReportData.reports.find(r => r.territoryId === territory.id);
                    if (report && !report.territoryNotWorked) {
                        (report.workedBlocksIds || []).forEach(id => tempWorkedBlocks.add(parseInt(id.split('-').pop()!)));
                    }

                    if (tempWorkedBlocks.size >= (territory.totalBlocks || 1)) {
                        const completionDate = (assignment.lastReportData.reportedAt as Timestamp).toDate();
                        const startAssignment = allAssignmentsForTerritory[cycleStartIndex];
                        
                        if (completionDate >= serviceYearStart && completionDate <= serviceYearEnd) {
                            completedCyclesInServiceYear.push({
                                ...assignment,
                                _cycleStartAssignment: startAssignment,
                            });
                        }
                        
                        penultimateCycleCompletionDate = lastCompletionDate;
                        lastCompletionDate = completionDate;
                        tempWorkedBlocks.clear();
                        cycleStartIndex = i + 1;
                    }
                }
            }


            if (completedCyclesInServiceYear.length === 0) continue;
            
            const transformToS13 = (endAssignment: any): ReporteS13Data => {
                const isStartDateValid = endAssignment._cycleStartAssignment?.date && endAssignment._cycleStartAssignment.date !== 'N/A';
                return {
                    id: endAssignment.id,
                    territoryNumber: territory.number || territory.name,
                    lastCompletedHistoric: '', // This will be handled by the penultimate date
                    firstAssignedTo: endAssignment._cycleStartAssignment?.userName || 'N/A',
                    firstAssignedDate: isStartDateValid ? format(parseISO(endAssignment._cycleStartAssignment.date), 'dd/MM/yy') : 'N/A',
                    completedCurrentCycle: format((endAssignment.lastReportData!.reportedAt as Timestamp).toDate(), "dd/MM/yy"),
                    fullCampaignHistory: [],
                }
            };
            
            const lastCycleInYear = completedCyclesInServiceYear[completedCyclesInServiceYear.length - 1];

            s13Data.push({
                territoryId: territory.id,
                territoryNumber: territory.number || territory.name,
                lastCycle: lastCycleInYear ? transformToS13(lastCycleInYear) : undefined,
                penultimateCycle: penultimateCycleCompletionDate ? {
                    id: 'penultimate',
                    territoryNumber: territory.number || territory.name,
                    firstAssignedTo: 'Histórico',
                    firstAssignedDate: 'N/A',
                    completedCurrentCycle: format(penultimateCycleCompletionDate, 'dd/MM/yy'),
                    lastCompletedHistoric: '',
                    fullCampaignHistory: []
                } : undefined,
            });
        }
        
        return s13Data.sort((a, b) => (a.territoryNumber || "").localeCompare(b.territoryNumber || "", undefined, { numeric: true }));
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

