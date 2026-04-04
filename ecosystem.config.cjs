module.exports = {
  apps: [
    {
      name:        'finbot-webhook',
      script:      'python3',
      args:        `${process.env.HOME}/projects/finbot/obsidian_webhook.py`,
      watch:       false,
      autorestart: true,
      env: { PYTHONUNBUFFERED: '1' },
    },
  ],
};
