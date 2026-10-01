'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2, Plus, ShieldAlert } from 'lucide-react'
import { ROLE_DESCRIPTIONS } from '@vamos/shared'
import { Alert, Button, StatusBadge } from '@/components/ui/primitives'
import { createAdminUserAction, updateAdminUserAction } from '@/server/actions/users'

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  isLocked: boolean
  activeSessions: number
}

const ROLES = Object.keys(ROLE_DESCRIPTIONS) as (keyof typeof ROLE_DESCRIPTIONS)[]

/**
 * Administrator account list and editor.
 *
 * Editing your own row hides the role and active controls: the server refuses
 * those changes anyway, and offering a control that always fails is worse than
 * not offering it.
 */
export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  function close() {
    setEditing(null)
    setCreating(false)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setMessage(null)

    startTransition(async () => {
      const result = editing
        ? await updateAdminUserAction({
            id: editing.id,
            name: String(form.get('name') ?? ''),
            email: String(form.get('email') ?? ''),
            role: editing.id === currentUserId ? editing.role : String(form.get('role') ?? ''),
            isActive: editing.id === currentUserId ? true : form.get('isActive') === 'on',
            password: String(form.get('password') ?? ''),
          })
        : await createAdminUserAction({
            name: String(form.get('name') ?? ''),
            email: String(form.get('email') ?? ''),
            password: String(form.get('password') ?? ''),
            role: String(form.get('role') ?? 'EDITOR'),
            isActive: form.get('isActive') === 'on',
          })

      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }

      setMessage({ tone: 'success', text: editing ? 'Usuario actualizado.' : 'Usuario creado.' })
      close()
      router.refresh()
    })
  }

  const isOpen = creating || Boolean(editing)

  return (
    <>
      {message ? (
        <div className="mb-4">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setCreating(true); setEditing(null) }}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      <div className="admin-panel overflow-hidden">
        <table className="admin-table">
          <caption className="sr-only">Usuarios con acceso al panel</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Email</th>
              <th scope="col">Rol</th>
              <th scope="col">Último acceso</th>
              <th scope="col">Estado</th>
              <th scope="col"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium text-heading">
                  {user.name}
                  {user.id === currentUserId ? (
                    <span className="ml-2 text-[0.6875rem] font-normal text-subtle-foreground">(vos)</span>
                  ) : null}
                </td>
                <td>{user.email}</td>
                <td>
                  {ROLE_DESCRIPTIONS[user.role as keyof typeof ROLE_DESCRIPTIONS]?.name ?? user.role}
                </td>
                <td className="text-[0.75rem]">{user.lastLoginAt ?? 'Nunca'}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge status={user.isActive ? 'APPROVED' : 'ARCHIVED'} />
                    {user.isLocked ? (
                      <span
                        className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-status-warning"
                        title="Bloqueada por intentos fallidos"
                      >
                        <ShieldAlert className="size-3" aria-hidden="true" />
                        Bloqueada
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => { setEditing(user); setCreating(false) }}
                    className="text-[0.8125rem] font-medium text-primary hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 bg-slate-950/55"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog-title"
            className="relative w-full max-w-md rounded-panel bg-surface p-5 shadow-panel"
          >
            <h2 id="user-dialog-title" className="text-[0.9375rem] font-semibold text-heading">
              {editing ? `Editar ${editing.name}` : 'Nuevo usuario'}
            </h2>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="u-name" className="admin-label">
                  Nombre <span className="text-status-danger">*</span>
                </label>
                <input
                  id="u-name"
                  name="name"
                  defaultValue={editing?.name}
                  required
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="u-email" className="admin-label">
                  Email <span className="text-status-danger">*</span>
                </label>
                <input
                  id="u-email"
                  name="email"
                  type="email"
                  defaultValue={editing?.email}
                  required
                  autoComplete="off"
                  className="admin-input"
                />
              </div>

              <div>
                <label htmlFor="u-password" className="admin-label">
                  Contraseña {editing ? '' : <span className="text-status-danger">*</span>}
                </label>
                <input
                  id="u-password"
                  name="password"
                  type="password"
                  required={!editing}
                  autoComplete="new-password"
                  className="admin-input"
                />
                <p className="mt-1 text-[0.75rem] text-subtle-foreground">
                  {editing
                    ? 'Dejala vacía para no cambiarla. Al rotarla se cierran todas sus sesiones.'
                    : 'Mínimo 12 caracteres, con mayúscula, minúscula y número.'}
                </p>
              </div>

              {editing?.id === currentUserId ? (
                <Alert tone="info">
                  No podés cambiar tu propio rol ni desactivar tu cuenta. Pedíselo a otro super
                  administrador.
                </Alert>
              ) : (
                <>
                  <div>
                    <label htmlFor="u-role" className="admin-label">
                      Rol
                    </label>
                    <select
                      id="u-role"
                      name="role"
                      defaultValue={editing?.role ?? 'EDITOR'}
                      className="admin-input"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_DESCRIPTIONS[role].name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editing ? editing.isActive : true}
                      className="size-4 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-[0.8125rem] text-foreground">Cuenta activa</span>
                  </label>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={close} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                  {editing ? 'Guardar' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
