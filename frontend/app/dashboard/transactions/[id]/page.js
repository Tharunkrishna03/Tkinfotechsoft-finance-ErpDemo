import { Suspense } from "react";
import CustomerTransactionContent from "./transaction-detail-client";


export default async function CustomerTransactionPage({ params }) {
  const resolvedParams = await (params || {});
  const id = resolvedParams?.id;

  if (!id) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Invalid Transaction ID</div>;
  }

  return (
    <Suspense fallback={null}>
      <CustomerTransactionContent customerId={id} />
    </Suspense>
  );
}
