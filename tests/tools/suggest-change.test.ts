import * as v from 'valibot'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reporter } from '../../src/github/reporter'
import { createSuggestChangeTool } from '../../src/tools/suggest-change'

const makeReporter = (postReviewComment: Reporter['postReviewComment']): Reporter => ({
  postReviewComment,
  postSummary: vi.fn(),
})

const failurePath = 'empty input array throws at items[0] in parse()'

describe('createSuggestChangeTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defines a suggest_change tool with parameters', () => {
    const reporter = makeReporter(vi.fn().mockResolvedValue('http://c'))
    const tool = createSuggestChangeTool(reporter)

    expect(tool.name).toBe('suggest_change')
    expect(tool.input).toBeTypeOf('object')
    expect(tool.input).not.toBeNull()
    expect(tool.run).toBeTypeOf('function')
  })

  it('forwards args to reporter.postReviewComment and returns the url', async () => {
    const postReviewComment = vi.fn().mockResolvedValue('http://c')
    const reporter = makeReporter(postReviewComment)
    const tool = createSuggestChangeTool(reporter)

    const args = {
      filePath: 'src/index.ts',
      comment: 'fix this',
      failurePath,
      startLine: 10,
      endLine: 12,
    }
    const result = await tool.run({ input: args })

    expect(postReviewComment).toHaveBeenCalledTimes(1)
    expect(postReviewComment).toHaveBeenCalledWith({
      filePath: 'src/index.ts',
      comment: 'fix this',
      startLine: 10,
      endLine: 12,
    })
    expect(typeof result).toBe('string')
    expect(result).toContain('http://c')
  })

  it("returns 'Comment posted.' when postReviewComment returns undefined", async () => {
    const postReviewComment = vi.fn().mockResolvedValue(undefined)
    const reporter = makeReporter(postReviewComment)
    const tool = createSuggestChangeTool(reporter)

    const result = await tool.run({
      input: {
        filePath: 'src/index.ts',
        comment: 'fix this',
        failurePath,
      },
    })

    expect(postReviewComment).toHaveBeenCalledTimes(1)
    expect(result).toBe('Comment posted.')
  })

  it('does not post the failurePath', async () => {
    const postReviewComment = vi.fn().mockResolvedValue('http://c')
    const tool = createSuggestChangeTool(makeReporter(postReviewComment))

    await tool.run({
      input: { filePath: 'src/index.ts', comment: 'fix this', failurePath },
    })

    expect(postReviewComment).toHaveBeenCalledWith({
      filePath: 'src/index.ts',
      comment: 'fix this',
      startLine: undefined,
      endLine: undefined,
    })
  })

  it('requires failurePath in the input schema', () => {
    const tool = createSuggestChangeTool(makeReporter(vi.fn()))
    const result = v.safeParse(tool.input, {
      filePath: 'src/index.ts',
      comment: 'fix this',
    })

    expect(result.success).toBe(false)
  })

  it.each(['', '   ', 'n/a', 'might fail', '\n  unknown \n'])(
    'rejects a comment with failurePath %j and posts nothing',
    async (blank) => {
      const postReviewComment = vi.fn().mockResolvedValue('http://c')
      const tool = createSuggestChangeTool(makeReporter(postReviewComment))

      await expect(
        tool.run({
          input: { filePath: 'src/index.ts', comment: 'fix this', failurePath: blank },
        })
      ).rejects.toThrow(/failurePath/)
      expect(postReviewComment).not.toHaveBeenCalled()
    }
  )
})
