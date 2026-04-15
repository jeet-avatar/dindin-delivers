---
source: SuiteScript 2.x API Reference — N/xml Module
netsuite_version: 2024.2+
verified: Claude training data (Oracle official docs)
last_updated: 2026-04-15
---

# N/xml Module

The N/xml module provides XML parsing, DOM manipulation, and XPath querying capabilities.
Use it to parse XML responses from external APIs, SOAP web services, and EDI integrations.
Available in server-side scripts only.

## Loading the Module

```javascript
define(['N/xml'], function(xml) { ... });
```

## Parsing XML

### xml.Parser.fromString(options)
Parses an XML string into a DOM Document object.

```javascript
var xmlString = '<?xml version="1.0"?><orders><order id="1"><amount>100.00</amount></order></orders>';

var document = xml.Parser.fromString({ text: xmlString });
// Returns: xml.Document object
```

## XPath Queries

### xml.XPath.select(options)
Evaluates an XPath expression against a node and returns matching nodes.

```javascript
// Get all order elements
var orderNodes = xml.XPath.select({
  node: document,
  xpath: '//order'
});
// Returns: Array of xml.Node objects

// Get a single node value
var amounts = xml.XPath.select({
  node: document,
  xpath: '//order/amount/text()'
});
var amountValue = amounts[0].nodeValue; // '100.00'

// Get with attribute filter
var specificOrder = xml.XPath.select({
  node: document,
  xpath: '//order[@id="1"]'
});
```

## Document Object (xml.Document)

The document object is the root of the DOM tree.

```javascript
// Get root element
var root = document.documentElement;

// Get elements by tag name
var nodeList = document.getElementsByTagName('order');
// Returns NodeList

// Create a new element
var newElement = document.createElement('item');
newElement.setAttribute('id', '123');

// Create text node
var textNode = document.createTextNode('Hello World');
```

## Node Object (xml.Node)

```javascript
// Node properties
node.nodeName       // Tag name (string), e.g. 'order'
node.nodeType       // Node type constant
node.nodeValue      // Value for text/attribute nodes (string|null)
node.textContent    // All text content of node and descendants

// Navigation
node.parentNode
node.childNodes       // NodeList of child nodes
node.firstChild
node.lastChild
node.nextSibling
node.previousSibling

// Element-specific
node.getAttribute('id')            // Get attribute value
node.setAttribute('id', '123')     // Set attribute value
node.hasAttribute('id')            // Boolean
node.removeAttribute('id')

// Get child elements by tag name
var children = node.getElementsByTagName('item');

// Append child
node.appendChild(childNode);
```

## Node Type Constants

```javascript
xml.NodeType.ELEMENT_NODE                // 1 — <tag> elements
xml.NodeType.ATTRIBUTE_NODE              // 2 — tag attributes
xml.NodeType.TEXT_NODE                   // 3 — text content
xml.NodeType.CDATA_SECTION_NODE         // 4 — CDATA sections
xml.NodeType.PROCESSING_INSTRUCTION_NODE // 7 — <?...?> instructions
xml.NodeType.COMMENT_NODE               // 8 — <!-- comments -->
xml.NodeType.DOCUMENT_NODE              // 9 — root document
```

## Serializing XML Back to String

```javascript
var xmlSerializer = new xml.Serializer();
var xmlOutput = xmlSerializer.serializeToString(document);
// Returns: XML string
```

## Common Patterns

### Parse SOAP XML response
```javascript
require(['N/https', 'N/xml'], function(https, xml) {

  var soapBody = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
                 '<soap:Body><getOrderResponse><order>' +
                 '<id>1234</id><status>Shipped</status><amount>500.00</amount>' +
                 '</order></getOrderResponse></soap:Body></soap:Envelope>';

  var doc = xml.Parser.fromString({ text: soapBody });

  // Extract values using XPath
  var idNodes = xml.XPath.select({ node: doc, xpath: '//id/text()' });
  var statusNodes = xml.XPath.select({ node: doc, xpath: '//status/text()' });

  var orderId = idNodes[0] ? idNodes[0].nodeValue : null;
  var status = statusNodes[0] ? statusNodes[0].nodeValue : null;

  log.debug({ title: 'SOAP Response', details: 'Order: ' + orderId + ', Status: ' + status });
});
```

### Parse REST API XML response
```javascript
require(['N/https', 'N/xml'], function(https, xml) {

  var response = https.get({
    url: 'https://api.example.com/products',
    headers: { 'Accept': 'application/xml' }
  });

  if (response.code === 200) {
    var doc = xml.Parser.fromString({ text: response.body });

    // Get all product nodes
    var products = xml.XPath.select({ node: doc, xpath: '//product' });

    var results = [];
    products.forEach(function(productNode) {
      var nameNodes = xml.XPath.select({ node: productNode, xpath: 'name/text()' });
      var priceNodes = xml.XPath.select({ node: productNode, xpath: 'price/text()' });

      results.push({
        name: nameNodes[0] ? nameNodes[0].nodeValue : '',
        price: priceNodes[0] ? parseFloat(priceNodes[0].nodeValue) : 0
      });
    });

    log.debug({ title: 'Products', details: JSON.stringify(results) });
  }
});
```

### Build XML for outbound request
```javascript
require(['N/xml'], function(xml) {

  function buildOrderXML(orderId, amount, currency) {
    var doc = xml.Parser.fromString({
      text: '<?xml version="1.0" encoding="UTF-8"?><root/>'
    });

    var root = doc.documentElement;

    var orderEl = doc.createElement('order');
    orderEl.setAttribute('id', orderId.toString());

    var amountEl = doc.createElement('amount');
    amountEl.setAttribute('currency', currency);
    amountEl.appendChild(doc.createTextNode(amount.toString()));

    orderEl.appendChild(amountEl);
    root.appendChild(orderEl);

    var serializer = new xml.Serializer();
    return serializer.serializeToString(doc);
  }

  var xmlPayload = buildOrderXML(1234, 500.00, 'USD');
  log.debug({ title: 'XML Output', details: xmlPayload });
});
```

### EDI / flat XML parsing
```javascript
require(['N/xml'], function(xml) {

  function safeGetText(doc, xpath) {
    var nodes = xml.XPath.select({ node: doc, xpath: xpath + '/text()' });
    return nodes.length > 0 ? nodes[0].nodeValue : '';
  }

  var doc = xml.Parser.fromString({ text: ediXmlString });

  var data = {
    poNumber: safeGetText(doc, '//PurchaseOrderNumber'),
    vendorId: safeGetText(doc, '//VendorID'),
    totalAmount: parseFloat(safeGetText(doc, '//TotalAmount') || '0')
  };

  log.debug({ title: 'EDI Parsed', details: JSON.stringify(data) });
});
```

## Notes

- N/xml is for XML only — for JSON, use `JSON.parse()` and `JSON.stringify()` (native JS)
- XPath is the most reliable way to extract values from deeply nested XML — avoid manual
  DOM traversal with childNodes/firstChild chains
- Always handle empty XPath results (check `nodes.length > 0`) to avoid null reference errors
- CDATA sections are handled transparently — `nodeValue` returns the inner text
- For large XML documents, use XPath queries that target specific elements rather than
  querying the entire document tree
