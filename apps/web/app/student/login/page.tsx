import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function StudentLoginPage() {
    return (
        <Suspense>
            <LoginForm type="student" />
        </Suspense>
    );
}
