import axios, { AxiosResponse } from "axios";

export default async (): Promise<string> => {
  const response: AxiosResponse = await axios.get(
    `https://api64.ipify.org?format=json`
  );
  return response.data.ip;
};
