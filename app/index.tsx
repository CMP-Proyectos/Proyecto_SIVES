import React from "react";
import ReportFlowPage from "../src/features/reportFlow/ReportFlowPage";
import { getActivitiesByIds, getDetailsByLocalityIds } from "../src/services/dataService";
import { db } from "../src/services/db_local";

if (typeof window !== "undefined") {
  (window as any).getActivitiesByIds = getActivitiesByIds;
  (window as any).getDetailsByLocalityIds = getDetailsByLocalityIds;
  (window as any).db = db;
}

export default function IndexPage() {
  return <ReportFlowPage />;
}
