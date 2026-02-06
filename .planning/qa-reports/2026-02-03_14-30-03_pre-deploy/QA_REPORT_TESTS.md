# QA Report: Test Execution

**Date**: Tue Feb  3 14:30:19 PST 2026
**Phase**: pre-deploy

---

## Backend Tests

```
/opt/anaconda3/lib/python3.12/site-packages/fastapi/dependencies/utils.py:112: in get_param_sub_dependant
    return get_sub_dependant(
/opt/anaconda3/lib/python3.12/site-packages/fastapi/dependencies/utils.py:148: in get_sub_dependant
    sub_dependant = get_dependant(
/opt/anaconda3/lib/python3.12/site-packages/fastapi/dependencies/utils.py:290: in get_dependant
    add_param_to_fields(field=param_field, dependant=dependant)
/opt/anaconda3/lib/python3.12/site-packages/fastapi/dependencies/utils.py:470: in add_param_to_fields
    if field_info.in_ == params.ParamTypes.path:
       ^^^^^^^^^^^^^^
E   AttributeError: 'FieldInfo' object has no attribute 'in_'
```

## iOS Tests

*Note: iOS tests require Xcode and must be run manually:*

```bash
xcodebuild test -workspace apps/ios/customer/eatfaircustomer.xcworkspace -scheme eatfaircustomer -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

## Summary

**Status**: ⚠️ PARTIAL (requires manual iOS test execution)
