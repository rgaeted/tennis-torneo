import { Suspense } from "react";
import NavBar from "@/components/NavBar";
import InscribirseForm from "./InscribirseForm";

export default function InscribirsePage() {
  return (
    <>
      <NavBar />
      <Suspense>
        <InscribirseForm />
      </Suspense>
    </>
  );
}
