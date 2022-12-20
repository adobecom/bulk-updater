/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import fs from 'fs';
import express from 'express';
import path from 'path';

const __dirname = path.resolve();
const app = express();

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(404).send('File not found');
        }
        res.send(data);
    });
});

const port = 3023;
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
