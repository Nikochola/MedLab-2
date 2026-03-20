import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function InstitutionLoginPage() {
    return (
        <Suspense>
            <LoginForm type="institution" />
        </Suspense>
    );
}
