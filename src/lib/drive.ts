export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  hasThumbnail?: boolean;
  parents?: string[];
  isFolder?: boolean;
}

export interface DriveFolder {
  id: string;
  name: string;
}

/**
 * List folders inside a given parent folder in Google Drive
 */
export async function listDriveFolders(
  accessToken: string,
  parentId = 'root'
): Promise<DriveFolder[]> {
  try {
    const parentQuery = parentId === 'root' ? "'root' in parents" : `'${parentId}' in parents`;
    const q = `${parentQuery} and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&pageSize=50&fields=${encodeURIComponent('files(id, name)')}&orderBy=name`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Error listing drive folders:', err);
    return [];
  }
}

/**
 * List image files inside a specific Drive folder or across the entire Drive
 */
export async function listDriveImageFiles(
  accessToken: string,
  folderId?: string,
  searchQuery?: string
): Promise<DriveFile[]> {
  try {
    const clauses: string[] = ["mimeType contains 'image/'", 'trashed = false'];

    if (folderId && folderId !== 'all') {
      clauses.push(`'${folderId}' in parents`);
    }

    if (searchQuery && searchQuery.trim()) {
      clauses.push(`name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`);
    }

    const query = clauses.join(' and ');
    const fields = encodeURIComponent(
      'files(id, name, mimeType, thumbnailLink, iconLink, size, createdTime, modifiedTime, parents)'
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&pageSize=40&fields=${fields}&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error: any) {
    console.error('Error fetching Drive files:', error);
    throw error;
  }
}

/**
 * Download a file from Google Drive and convert to base64 Data URL
 */
export async function fetchDriveFileBase64(
  fileId: string,
  accessToken: string
): Promise<{ base64: string; mimeType: string }> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file from Drive (${res.status})`);
    }

    const blob = await res.blob();
    const mimeType = blob.type || 'image/jpeg';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        resolve({ base64: resultStr, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error('Error downloading drive file base64:', error);
    throw error;
  }
}
