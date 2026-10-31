@api
## Product Catalog API
- The catalog behind the shop pages: products, brands and search. Errors come as HTTP 200 with the code in the body

---

@smoke
### List All Products
#### Verify Products List contains "Blue Top" for Rs. 500

---

### Reject Unsupported Method on Products List
#### Verify POST to Products List is rejected as unsupported

---

### Search Products for "<query>"
| query | product       |
| ----- | ------------- |
| top   | Blue Top      |
| dress | Stylish Dress |
#### Search Products for "<query>" and verify "<product>" is found
