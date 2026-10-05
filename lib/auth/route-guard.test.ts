import { describe, it, expect } from 'vitest'
import { matchRoleRoutePrefix, isRoleAllowedForPath } from './route-guard'

describe('matchRoleRoutePrefix', () => {
  it('mengenali prefix /admin', () => {
    expect(matchRoleRoutePrefix('/admin/kelas')).toBe('/admin')
  })

  it('mengembalikan null untuk path publik', () => {
    expect(matchRoleRoutePrefix('/login')).toBeNull()
  })
})

describe('isRoleAllowedForPath', () => {
  it('mahasiswa tidak boleh akses /admin', () => {
    expect(isRoleAllowedForPath('/admin/kelas', 'mahasiswa')).toBe(false)
  })

  it('dosen boleh akses /dosen', () => {
    expect(isRoleAllowedForPath('/dosen/jurnal', 'dosen')).toBe(true)
  })

  it('path publik selalu diizinkan', () => {
    expect(isRoleAllowedForPath('/login', null)).toBe(true)
  })
})
