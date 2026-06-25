import { Suspense } from "react";
import CustomerEditClient from "./customer-edit-client";


export default async function DashboardCustomerEditPage({ params }) {
  const resolvedParams = await (params || {});
  const id = resolvedParams?.id;

  if (!id) {
    return <div style={{ padding: "20px" }}>Invalid Customer ID</div>;
  }

  return (
    <Suspense fallback={null}>
      <CustomerEditClient customerId={id} />
    </Suspense>
  );
}
