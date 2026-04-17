# N/certificate-control — SuiteScript 2.x Module

> Source: Oracle NetSuite Official Documentation — SuiteScript 2.x API Reference
> URL: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1547247950.html
> Module: N/certificate-control
> Version: SuiteScript 2.x / 2.1

# N/certificateControl Module

Use the N/certificateControl module to enable scripting access to the Digital Certificates list found in the UI at _Setup > Company > Certificates_. You can use this module to find, create, update, read and delete certificate records. For more information, see [Digital Signing](chapter_1542656608.html) and [Uploading Digital Certificates](section_1542656620.html).

  [   ](/app/help/helpcenter.nl?fid=section_0302040948)                                

To access the N/certificateControl module, you must use the Execute As Role field on the script deployment record. Select either the Administrator role or a custom role with the Certificate Access permission. For more information, see [Access to Digital Certificates](subsect_1547501301.html).

Important: 

The certificate record holds information for a digital certificate, but it is not a standard NetSuite record and cannot be accessed with the N/record.

## In This Help Topic

  - N/certificateControl Module Members

  - Certificate Object Members


## N/certificateControl Module Members

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Object |  [certificateControl.Certificate](section_156201811375.html) |  object |  Server scripts |  Encapsulates a digital certificate record.  
Method |  [certificateControl.findCertificates(options)](section_1547249535.html) |  object |  Server scripts |  Returns metadata about the certificate(s).  
[certificateControl.findUsages(options)](section_156146904779.html) |  object[] |  Server scripts |  Returns an audit trail of how a certificate has been used. Includes operations performed with time stamps.  
[certificateControl.createCertificate(options)](section_156156407497.html) |  [certificateControl.Certificate](section_156201811375.html) |  Server scripts |  Creates a certificate record using a file from the File Cabinet. After saving with [Certificate.save()](section_156218491774.html), the certificate is accessible on the **Certificates**.  
[certificateControl.deleteCertificate(options)](section_156199793585.html) |  string |  Server scripts |  Deletes a certificate record that has been uploaded to the **Certificates** list in the UI or created using [certificateControl.createCertificate(options)](section_156156407497.html) and saved with [Certificate.save()](section_156218491774.html).  
[certificateControl.loadCertificate(options)](section_156201707058.html) |  [certificateControl.Certificate](section_156201811375.html) |  Server scripts |  Loads a certificate record that has been uploaded to the **Certificates** list in the UI or created using [certificateControl.createCertificate(options)](section_156156407497.html).  
[certificateControl.lock(options)](section_161316650912.html) |  string |  Server scripts |  Locks a certificate record so that it cannot be edited.  
[certificateControl.unlock(options)](section_161316704169.html) |  string |  Server scripts |  Unlocks a certificate record that has been locked with [certificateControl.lock(options)](section_161316650912.html).  
Enum |  [certificateControl.Operation](section_156348578245.html) |  enum |  Server scripts |  Holds the values for the operation when searching for certificates with [certificateControl.findUsages(options)](section_156146904779.html).  
[certificateControl.Operator](section_156347310616.html) |  enum |  Server scripts |  Holds the values for search operators to use with the `name` and `description` parameters of the [certificateControl.findCertificates(options)](section_1547249535.html) method.  
[certificateControl.Type](section_1547250231.html) |  enum |  Server scripts |  Holds the values for the certificate file type to use with the `type` parameter of the [certificateControl.findCertificates(options)](section_1547249535.html) method.  

### Certificate Object Members

The following members are called on the [certificateControl.Certificate](section_156201811375.html) object.

Member Type |  Name |  Return Type / Value Type |  Supported Script Types |  Description  
---|---|---|---|---  
Method |  [Certificate.save()](section_156218491774.html) |  object containing the script ID of the new certificate record |  Server scripts |  Saves a certificate record.  
Property |  [Certificate.description](section_156218882054.html) |  string |  Server scripts |  Describes the certificate record.  
[Certificate.file](section_156261189191.html) |  [File Object Members](section_4205693274.html#bridgehead_4223145668) object |  Server scripts |  Includes the properties of the file uploaded to create the certificate.  
[Certificate.name](section_156261266478.html) |  string |  Server scripts |  The name of the certificate record.  
[Certificate.monthReminder](section_156263099184.html) |  boolean |  Server scripts |  The setting of the **Month** box for **Expiration Reminders** on the certificate record.  
[Certificate.notifications](section_156263222400.html) |  number[] |  Server scripts |  The internal IDs of the employees selected in the **Copy Employees** field on the certificate record.  
[Certificate.password](section_156263312543.html) |  string (write-only) |  Server scripts |  The password for the digital certificate. You can create a GUID for the password using [Form.addSecretKeyField(options)](section_4550325064.html) or you can create an API secret for the secret at _Setup > Company > API Secrets_.  
[Certificate.restrictions](section_156263396061.html) |  number[] |  Server scripts |  The internal IDs of the employees selected in the **Restrict to Employees** field of the certificate record.  
[Certificate.scriptId](section_156269109525.html) |  string |  Server scripts |  The ID of the certificate record.  
[Certificate.subsidiaries](section_156269250571.html) |  number[] |  Server scripts |  The internal IDs of the subsidiaries associated with the certificate record.  
[Certificate.threeMonthsReminder](section_156269504090.html) |  boolean |  Server scripts |  Indicates the setting of the **3 Months** box for **Expiration Reminders** on the certificate record.  
[Certificate.weekReminder](section_156269529064.html) |  boolean |  Server scripts |  Indicates the setting of the **Week** box for **Expiration Reminders** on the certificate record.  

### Related Topics

  - [Digital Signing](chapter_1542656608.html)
  - [Uploading Digital Certificates](section_1542656620.html)
  - [N/https/clientCertificate Module](section_1543986321.html)
  - [N/crypto/certificate Module](section_1543432423.html)
  - [SuiteScript 2.x Modules](chapter_4220488571.html)
  - [SuiteScript 2.x](article_8161516336.html)


[General Notices](chapter_N000004.html)
