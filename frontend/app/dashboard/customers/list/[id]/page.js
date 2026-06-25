import { Suspense } from "react";
import CustomerTransactionRedirectContent from "./customer-redirect-client";


export default async function CustomerTransactionRedirect({ params }) {
  const resolvedParams = await (params || {});
  const id = resolvedParams?.id;

  return (
    <Suspense fallback={null}>
      <CustomerTransactionRedirectContent customerId={id} />
    </Suspense>
  );
}
