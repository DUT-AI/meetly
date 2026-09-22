'use client';

import { type ColumnDef, type ColumnFiltersState, type RowData, type SortingState, useTable } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { type DataTableFeatures, features } from './data-table-features';

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData extends RowData>({ columns, data, onRowClick }: DataTableProps<TData>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useTable({
    features,
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      sorting,
    },
  });

  const handleRowClick = (e: React.MouseEvent, rowData: TData) => {
    // Prevent row navigation if clicking on interactive elements like buttons, dropdowns, links
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }

    if (onRowClick) {
      onRowClick(rowData);
    } else {
      // Default task navigation if rowData has workspaceId and id
      const item = rowData as any;
      const workspaceId = item.workspaceId || item.workspace_id || (item.workspace && (item.workspace.$id || item.workspace.id));
      const taskId = item.$id || item.id;
      if (workspaceId && taskId) {
        router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
      }
    }
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return <TableHead key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>;
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={(e) => handleRowClick(e, row.original)}
                  className="cursor-pointer transition hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}
