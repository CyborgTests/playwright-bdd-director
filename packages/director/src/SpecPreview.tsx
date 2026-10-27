/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react'

const GHERKIN_TITLE =
  /^(Feature|Rule|Background|Scenario Outline|Scenario Template|Scenario|Example|Examples|Scenarios):\s*(.*)$/
const GHERKIN_STEP = /^(Given|When|Then|And|But|\*)\s+(.*)$/
const MD_HEADING = /^(#{2,4})\s+(.*?)\s*$/

type Level = 'h2' | 'h3' | 'h4'

/** Heading level of a Gherkin title: Feature as a suite, Rule and scenarios below it */
const GHERKIN_LEVEL: Record<string, Level> = {
  Feature: 'h2',
  Rule: 'h3',
  Examples: 'h4',
  Scenarios: 'h4'
}

type Block =
  | { type: 'title'; level: Level; keyword?: string; name: string; tags: string[] }
  | { type: 'step'; keyword?: string; text: string }
  | { type: 'tags'; tags: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'docString'; lines: string[] }
  | { type: 'hr' }
  | { type: 'comment'; text: string }
  | { type: 'text'; text: string; underStep: boolean } // notes, descriptions

/**
 * Preview of a spec, one look for both formats: suites, rules and test cases as headings with
 * their tags, steps (Gherkin keywords in bold), examples and data tables, DocStrings, notes. Spec
 * Markdown is not plain Markdown - `<placeholders>`, tags lines and tables right under a heading.
 * Gherkin: English keywords. Built from React elements, never as HTML from the file.
 */
export const SpecPreview: React.FC<{ content: string; markdown: boolean }> = ({
  content,
  markdown
}) => (
  <div className="director-preview-spec">
    {(markdown ? parseMarkdown(content) : parseGherkin(content)).map((block, i) => (
      <PreviewBlock key={i} block={block} />
    ))}
  </div>
)

const PreviewBlock: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'title': {
      const Heading = block.level
      return (
        <Heading>
          {block.keyword && <span className="director-spec-keyword">{block.keyword}: </span>}
          <Inline text={block.name} />
          {block.tags.length > 0 && <Tags tags={block.tags} />}
        </Heading>
      )
    }
    case 'step':
      return (
        <div className="director-spec-step">
          {block.keyword && <strong className="director-spec-keyword">{block.keyword} </strong>}
          <Inline text={block.text} />
        </div>
      )
    case 'tags':
      return <Tags tags={block.tags} />
    case 'table':
      return (
        <table>
          <thead>
            <tr>
              {block.rows[0].map((cell, i) => (
                <th key={i}>
                  <Inline text={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.slice(1).map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'docString':
      return (
        <pre>
          <code>{block.lines.join('\n')}</code>
        </pre>
      )
    case 'hr':
      return <hr />
    case 'comment':
      return <div className="director-spec-comment">{block.text}</div>
    default:
      return <p className={block.underStep ? 'director-spec-step-note' : undefined}>{block.text}</p>
  }
}

const Tags: React.FC<{ tags: string[] }> = ({ tags }) => (
  <span className="director-spec-tags">
    {tags.map((tag) => (
      <code key={tag}>{tag}</code>
    ))}
  </span>
)

/** "Strings" and <placeholders> of a step, title or cell */
const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/("[^"]*")/).map((part, i) =>
      part.startsWith('"') ? (
        <code key={i}>
          <Placeholders text={part} />
        </code>
      ) : (
        <Placeholders key={i} text={part} />
      )
    )}
  </>
)

const Placeholders: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(<[^<>\s][^<>]*>)/).map((part, i) =>
      part.startsWith('<') ? (
        <em key={i} className="director-spec-placeholder">
          {part}
        </em>
      ) : (
        part
      )
    )}
  </>
)

/** Tags and table lines, the same in both formats; false: the line is something else */
function commonBlock(line: string, blocks: Block[]): boolean {
  if (line.startsWith('@')) {
    blocks.push({ type: 'tags', tags: line.split(/\s+/) })
  } else if (line.startsWith('|')) {
    const cells = line
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim().replace(/\\\|/g, '|'))
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) return true // Markdown header separator
    const last = blocks[blocks.length - 1]
    if (last?.type === 'table') last.rows.push(cells)
    else blocks.push({ type: 'table', rows: [cells] })
  } else {
    return false
  }
  return true
}

/** A title takes the tags line right above it, shown after its name */
function pushTitle(blocks: Block[], title: Omit<Extract<Block, { type: 'title' }>, 'tags'>): void {
  const last = blocks[blocks.length - 1]
  const tags = last?.type === 'tags' ? last.tags : []
  if (last?.type === 'tags') blocks.pop()
  blocks.push({ ...title, tags })
}

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = []
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || commonBlock(line, blocks)) continue
    const heading = line.match(MD_HEADING)
    if (heading?.[1] === '####') {
      blocks.push({ type: 'step', text: heading[2] })
    } else if (heading) {
      pushTitle(blocks, {
        type: 'title',
        level: heading[1] === '##' ? 'h2' : 'h3',
        name: heading[2]
      })
    } else if (/^-{3,}$/.test(line)) {
      blocks.push({ type: 'hr' })
    } else {
      const underStep = lastOf(blocks, ['step', 'title']) === 'step'
      blocks.push({ type: 'text', text: line.replace(/^-\s+/, ''), underStep })
    }
  }
  return blocks
}

function parseGherkin(content: string): Block[] {
  const blocks: Block[] = []
  let docString: { fence: string; lines: string[]; indent: number } | null = null
  let inRule = false
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (docString) {
      if (line === docString.fence) {
        blocks.push({ type: 'docString', lines: docString.lines })
        docString = null
      } else {
        docString.lines.push(raw.slice(Math.min(docString.indent, raw.search(/\S|$/))))
      }
      continue
    }
    if (!line || commonBlock(line, blocks)) continue
    const fence = line.match(/^("""|```)/)
    const title = line.match(GHERKIN_TITLE)
    const step = line.match(GHERKIN_STEP)
    if (fence) {
      docString = { fence: fence[1], lines: [], indent: raw.search(/\S/) }
    } else if (title) {
      if (title[1] === 'Rule') inRule = true
      if (title[1] === 'Feature') inRule = false
      const level = GHERKIN_LEVEL[title[1]] ?? (inRule ? 'h4' : 'h3')
      pushTitle(blocks, { type: 'title', level, keyword: title[1], name: title[2] })
    } else if (step) {
      blocks.push({ type: 'step', keyword: step[1], text: step[2] })
    } else if (line.startsWith('#')) {
      blocks.push({ type: 'comment', text: line.replace(/^#\s?/, '') })
    } else {
      blocks.push({ type: 'text', text: line, underStep: false })
    }
  }
  return blocks
}

/** Type of the latest block among the given types */
function lastOf(blocks: Block[], types: Block['type'][]): Block['type'] | undefined {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (types.includes(blocks[i].type)) return blocks[i].type
  }
  return undefined
}
