curl -X POST https://api.convertkit.com/v3/broadcasts\
     -H 'Content-Type: application/json'\
     -d '{ "api_secret": "CONVERTKIT_API_SECRET",
           "description": "Paid member newsletter for 04/26",
           "subject": "Weekly Update (04/26)",
           "send_at": "2025-07-14T02:19:27.000Z",
           "content": "<p>Your content here</p>" }'
