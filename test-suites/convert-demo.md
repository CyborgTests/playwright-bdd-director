@ui @skip
## [TS99] Conversion Demo
- Spec to try npm run adapt on: every part the converter moves between Markdown and Gherkin
- @skip keeps it out of runs - delete the file when done

---

### Background
#### Open Demo Page
- Notes under a step become "#" comments in Gherkin

---

@smoke @JIRA-123
### [TC99-01] Search for "<query>" shows "<result>"
- Examples table: becomes a Scenario Outline with Examples
| query  | result         |
| ------ | -------------- |
| Top    | Blue Top       |
| A \| B | Pipe in a cell |
#### Type "<query>" into Search Field
#### Click "Search" Button
- Wait for results to load
- Results replace the product grid
#### Verify "<result>" is shown in Results

---

### [] Case With Empty ID
#### Open Cart Page
#### Verify Cart is empty

---

### Case Without ID or Notes
#### Open Contact Page
#### Verify "Get In Touch" Heading is visible
