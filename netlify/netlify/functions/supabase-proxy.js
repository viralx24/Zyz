// Netlify Function: supabase-proxy
// Path: netlify/functions/supabase-proxy.js
// Required environment variables (set in Netlify site settings):
// - SUPABASE_URL (e.g. https://xxxxx.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (server-side service role key)
// Optional: ALLOWED_ORIGIN (restrict CORS to your domain)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('supabase-proxy: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.');
}

exports.handler = async function(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS'
        },
        body: ''
      };
    }

    const params = event.queryStringParameters || {};
    const action = params.action || 'videos';

    // helper to fetch from Supabase REST
    const supabaseFetch = async (path, qs = '') => {
      const url = `${SUPABASE_URL}/rest/v1/${path}${qs}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json'
        }
      });
      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`Supabase request failed: ${res.status} ${text}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    };

    if (action === 'videos') {
      // Build query string for PostgREST
      let qs = '?select=*';
      qs += '&link_status=eq.active';
      qs += '&status=eq.published';
      qs += '&order=created_at.desc';

      if (params.mainCategory) {
        qs += `&main_category=eq.${encodeURIComponent(params.mainCategory)}`;
      }
      if (params.quality) {
        qs += `&quality=eq.${encodeURIComponent(params.quality)}`;
      }
      if (params.countryCategory) {
        // contains for array: cs.{value}
        qs += `&country_categories=cs.{${encodeURIComponent(params.countryCategory)}}`;
      }
      if (params.popularTag) {
        qs += `&popular_tags=cs.{${encodeURIComponent(params.popularTag)}}`;
      }

      const videos = await supabaseFetch('videos', qs);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ videos })
      };
    }

    if (action === 'topCategories') {
      const qs = '?select=top_categories&link_status=eq.active&status=eq.published';
      const rows = await supabaseFetch('videos', qs);
      const set = new Set();
      rows.forEach(r => {
        if (r.top_categories && Array.isArray(r.top_categories)) {
          r.top_categories.forEach(c => set.add(c));
        }
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ topCategories: Array.from(set) })
      };
    }

    if (action === 'popularTags') {
      const qs = '?select=popular_tags&link_status=eq.active&status=eq.published';
      const rows = await supabaseFetch('videos', qs);
      const set = new Set();
      rows.forEach(r => {
        if (r.popular_tags && Array.isArray(r.popular_tags)) {
          r.popular_tags.forEach(t => set.add(t));
        }
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ popularTags: Array.from(set) })
      };
    }

    if (action === 'videoById') {
      const id = params.id;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing id param' }) };
      }
      const qs = `?select=*&id=eq.${encodeURIComponent(id)}&link_status=eq.active&status=eq.published`;
      const rows = await supabaseFetch('videos', qs);
      const video = rows && rows.length ? rows[0] : null;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ video })
      };
    }

    // unknown action
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Unknown action' })
    };
  } catch (err) {
    console.error('supabase-proxy error:', err);
    return {
      statusCode: err.status || 500,
      headers,
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};