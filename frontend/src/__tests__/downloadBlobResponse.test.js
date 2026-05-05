import { describe, test, expect, vi, beforeEach } from 'vitest'

// ── downloadBlobResponse ──────────────────────────────────────────────────────
import { downloadBlobResponse } from '../utils/format'

describe('downloadBlobResponse', () => {
  let createObjectURLSpy, revokeObjectURLSpy
  let appendChildSpy, removeChildSpy, clickSpy, anchorEl

  beforeEach(() => {
    clickSpy = vi.fn()
    anchorEl = { href: '', download: '', click: clickSpy }

    vi.spyOn(document, 'createElement').mockReturnValue(anchorEl)
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    // Note: remove() is called directly on element, not removeChild
    anchorEl.remove = vi.fn()

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('extracts filename from content-disposition header and triggers download', () => {
    const mockResponse = {
      headers: { 'content-disposition': 'attachment; filename="REVA_TonKho_2025-01-01.xlsx"' },
      data: new Blob(['fake excel data']),
    }

    downloadBlobResponse(mockResponse)

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorEl.download).toBe('REVA_TonKho_2025-01-01.xlsx')
    expect(anchorEl.href).toBe('blob:fake-url')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url')
  })

  test('falls back to "export.xlsx" when no content-disposition header', () => {
    const mockResponse = {
      headers: {},
      data: new Blob([]),
    }

    downloadBlobResponse(mockResponse)

    expect(anchorEl.download).toBe('export.xlsx')
    expect(clickSpy).toHaveBeenCalled()
  })

  test('handles content-disposition without quotes', () => {
    const mockResponse = {
      headers: { 'content-disposition': 'attachment; filename=report.xlsx' },
      data: new Blob([]),
    }

    downloadBlobResponse(mockResponse)

    expect(anchorEl.download).toBe('report.xlsx')
  })

  test('revokes object URL after triggering download', () => {
    const mockResponse = {
      headers: { 'content-disposition': 'attachment; filename="test.xlsx"' },
      data: new Blob([]),
    }

    downloadBlobResponse(mockResponse)

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
  })
})
