export const attributeDb = {
    "types": [
        {
            "id": 1,
            "name": "geology"
        }
    ],
    "definitions": [
        {
            "id": 1,
            "type": 1,
            "name": "speleotheme",
            "params": {
                "type": {
                    "required": true,
                    "type": "string",
                    "values": [
                        "dripstone",
                        "mammilary"
                    ]
                },
                "description": {
                    "type": "string",
                }
            }
        },
        {
            "id": 2,
            "type": 1,
            "name": "bedding",
            "params": {
                "dip": {
                    "type": "number"
                },
                "azimuth": {
                    "type": "number"
                }
            }
        }
    ]
}