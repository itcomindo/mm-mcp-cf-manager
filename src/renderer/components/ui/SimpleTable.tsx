import type { JSX, ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type SimpleTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  emptyMessage: string
}

export function SimpleTable<T>({ columns, rows, emptyMessage }: SimpleTableProps<T>): JSX.Element {
  if (rows.length === 0) {
    return <p className="text-[0.9em] text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="min-w-full border-collapse text-[0.9em]">
        <thead className="bg-surface-elevated">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="border-b border-border px-2 py-1.5 text-left font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="odd:bg-surface even:bg-background">
              {columns.map((column) => (
                <td key={column.key} className="border-b border-border px-2 py-1.5 align-top">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
