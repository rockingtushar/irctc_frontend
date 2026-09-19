export default async function handler(req, res) {
  const result = {};

  // IRCTC homepage
  try {
    const response = await fetch("https://www.irctc.co.in/", {
      method: "GET",
    });

    result.irctc = {
      success: true,
      status: response.status,
      url: response.url,
    };
  } catch (error) {
    result.irctc = {
      success: false,
      error: String(error),
    };
  }

  // NTES
  try {
    const response = await fetch(
      "https://enquiry.indianrail.gov.in/mntes/",
      {
        method: "GET",
      }
    );

    result.ntes = {
      success: true,
      status: response.status,
      url: response.url,
    };
  } catch (error) {
    result.ntes = {
      success: false,
      error: String(error),
    };
  }

  return res.status(200).json(result);
}