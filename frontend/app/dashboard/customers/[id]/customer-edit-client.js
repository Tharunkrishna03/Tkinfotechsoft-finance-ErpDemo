"use client";

import { useParams } from "next/navigation";
import CustomerForm from "../customer-form";

export default function CustomerEditClient({ customerId }) {
  const { id } = useParams();
  const activeId = customerId || id;

  return <CustomerForm customerId={activeId} mode="edit" />;
}
