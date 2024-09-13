export interface IFirebaseSessionDTO {
  idToken: string;
  localId: string;
  refreshToken: string;
  email: string;
  displayName: string;
}

export const startAndGetSessionToken =
  async (): Promise<IFirebaseSessionDTO> => {
    const body = JSON.stringify({
      email: process.env.TESTING_EMAIL,
      password: process.env.TESTING_PASSWORD,
      returnSecureToken: true,
    });

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.TESTING_FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        redirect: "follow",
      },
    );

    const data = await res.json();

    if (!data.idToken) throw new Error("Fail to start session.");

    console.log(data.idToken);
    return data;
  };
