import React from "react";
import { useGetIdentity } from "@refinedev/core";
import { UserRoleEnum } from "@/types/api";
import { AcademicLoadFilesList } from "./list";
import { AcademicLoadFilesListVicerrector } from "./list-vicerrector";

export const AcademicLoadFilesListWrapper: React.FC = () => {
    const { data: identity } = useGetIdentity<any>();
    const currentUserRole: string | null = (
        identity?.role ?? identity?.user_role ?? null
    )?.toString?.().toLowerCase?.() ?? null;
    const isVicerrector = currentUserRole === UserRoleEnum.VICERRECTOR.toLowerCase();

    if (isVicerrector) {
        return <AcademicLoadFilesListVicerrector />;
    }

    return <AcademicLoadFilesList />;
};
