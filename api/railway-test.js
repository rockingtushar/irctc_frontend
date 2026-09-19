export default async function handler(req, res) {
  const result = {};

  async function testUrl(name, url) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });

      return {
        success: true,
        status: response.status,
        url: response.url,
      };
    } catch (error) {
      return {
        success: false,
        name: error?.name,
        message: error?.message,
        cause: error?.cause
          ? {
              name: error.cause.name,
              message: error.cause.message,
              code: error.cause.code,
              errno: error.cause.errno,
              syscall: error.cause.syscall,
              hostname: error.cause.hostname,
            }
          : null,
      };
    }
  }

  result.google = await testUrl(
    "google",
    "https://www.google.com/"
  );

  result.irctc = await testUrl(
    "irctc",
    "https://www.irctc.co.in/"
  );

  result.ntes = await testUrl(
    "ntes",
    "https://enquiry.indianrail.gov.in/mntes/"
  );

  return res.status(200).json(result);
}