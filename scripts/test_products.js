(async () => {
  const base = 'http://localhost:5000';
  try {
    const publicResp = await fetch(`${base}/products`);
    console.log('---PUBLIC---');
    const publicText = await publicResp.text();
    console.log(publicText);
  } catch (e) {
    console.error('PUBLIC ERROR', e.message || e);
  }

  try {
    const loginResp = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
    });
    const loginJson = await loginResp.json().catch(() => null) || null;
    console.log('---LOGIN---');
    console.log(JSON.stringify(loginJson, null, 2));
    if (loginJson && loginJson.token) {
      try {
        const authResp = await fetch(`${base}/products`, {
          headers: { Authorization: 'Bearer ' + loginJson.token },
        });
        console.log('---AUTHED---');
        const authText = await authResp.text();
        console.log(authText);
      
        // Check system-settings access (requires settings:system permission)
        try {
          const sysPublic = await fetch(`${base}/system-settings/public`);
          console.log('---SYS_PUBLIC---');
          console.log(await sysPublic.text());
        } catch (e) {
          console.error('SYS_PUBLIC ERROR', e.message || e);
        }

        try {
          const sysAdmin = await fetch(`${base}/system-settings`, {
            headers: { Authorization: 'Bearer ' + loginJson.token },
          });
          console.log('---SYS_ADMIN---');
          console.log(await sysAdmin.text());
        } catch (e) {
          console.error('SYS_ADMIN ERROR', e.message || e);
        }
      } catch (e) {
        console.error('AUTHED ERROR', e.message || e);
      }
    }
  } catch (e) {
    console.error('LOGIN ERROR', e.message || e);
  }
})();
