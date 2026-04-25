import { DashboardWorkspaceLoading } from "@/components/dashboard/workspace-loading";

export default function TrainLoading() {
  return <DashboardWorkspaceLoading statCount={3} leftCards={1} rightCards={2} includeTable />;
}
