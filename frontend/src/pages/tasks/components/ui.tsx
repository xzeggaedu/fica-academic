import React from "react";

// Simple UI components using Tailwind CSS
export const TableContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-x-auto ${className}`}>
    {children}
  </div>
);

export const Table = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
    {children}
  </table>
);

export const Thead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <thead className={`bg-gray-50 ${className}`}>
    {children}
  </thead>
);

export const Tbody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>
    {children}
  </tbody>
);

export const Tr = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <tr className={`${className}`}>
    {children}
  </tr>
);

export const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);

export const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>
    {children}
  </td>
);

export const Chip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center ${className}`}>
    {children}
  </span>
);
