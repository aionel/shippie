import { defineTool } from '@flue/runtime'
import * as v from 'valibot'
import type { Reporter } from '../github/reporter'

/** Shortest `failurePath` accepted: rejects blanks and one-word placeholders like "n/a". */
export const MIN_FAILURE_PATH_LENGTH = 20

/**
 * `suggest_change` — posts an inline review comment on a file line or range.
 * Replaces the old AI-SDK `suggest_change` tool; the reporter handles GitHub or
 * local output. Errors are thrown so the agent can correct the line/path, or
 * supply a failure path (or drop the comment) when `failurePath` is missing.
 * `failurePath` is checked, not posted.
 */
export const createSuggestChangeTool = (reporter: Reporter) =>
  defineTool({
    name: 'suggest_change',
    description:
      'Post an inline review comment on a specific file and line range. Only use this on files with actionable problems. If several issues are on nearby lines, combine them into one comment that spans all of those lines. Include a fenced ```suggestion``` block with a direct replacement when proposing a concrete fix. Every comment must include a failurePath: the input or condition that triggers the problem and what goes wrong. A comment without one is rejected; if you cannot state one, do not comment.',
    input: v.object({
      filePath: v.pipe(
        v.string(),
        v.minLength(1),
        v.description('Path to the file, relative to the repo root or absolute.')
      ),
      comment: v.pipe(
        v.string(),
        v.minLength(1),
        v.description('The review comment. Short, specific, and actionable.')
      ),
      failurePath: v.pipe(
        v.string(),
        v.description(
          'The concrete failure: the input or condition that triggers it, and what goes wrong. Not posted; used to reject speculative comments.'
        )
      ),
      startLine: v.optional(
        v.pipe(
          v.number(),
          v.description('First line of the range (new-file line number).')
        )
      ),
      endLine: v.optional(
        v.pipe(
          v.number(),
          v.description('Last line of the range (new-file line number).')
        )
      ),
    }),
    run: async ({ input: { filePath, comment, failurePath, startLine, endLine } }) => {
      if (failurePath.trim().length < MIN_FAILURE_PATH_LENGTH) {
        throw new Error(
          'Comment not posted: failurePath must state the input or condition that triggers the problem and what goes wrong. Call suggest_change again with a failurePath, or drop the comment if you cannot state one.'
        )
      }
      const url = await reporter.postReviewComment({
        filePath,
        comment,
        startLine,
        endLine,
      })
      return url ? `Comment posted: ${url}` : 'Comment posted.'
    },
  })
