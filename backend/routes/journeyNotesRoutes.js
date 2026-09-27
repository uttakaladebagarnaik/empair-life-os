const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const pool = require("../config/db");

const router = express.Router();


// =====================================================
// FILE STORAGE
// =====================================================

const uploadRoot = path.join(
    __dirname,
    "../uploads/journey-notes"
);

fs.mkdirSync(uploadRoot, {
    recursive: true
});


// =====================================================
// ALLOWED FILE TYPES
// =====================================================

const allowedMimeTypes = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "application/pdf": ".pdf"
};


// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        const userDirectory = path.join(
            uploadRoot,
            String(req.user.userId)
        );

        fs.mkdirSync(
            userDirectory,
            {
                recursive: true
            }
        );

        cb(
            null,
            userDirectory
        );
    },


    filename: (req, file, cb) => {

        const safeOriginalName = path
            .basename(file.originalname)
            .replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

        cb(
            null,
            `${Date.now()}-${safeOriginalName}`
        );
    }

});


// =====================================================
// MULTER UPLOAD CONFIGURATION
// =====================================================

const upload = multer({

    storage,

    limits: {
        fileSize: 500 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        if (
            !allowedMimeTypes[
                file.mimetype
            ]
        ) {

            return cb(
                new Error(
                    "Only PNG, JPG/JPEG and PDF files are supported."
                )
            );
        }

        cb(
            null,
            true
        );
    }

});


// =====================================================
// DELETE STORED FILE
// =====================================================

const deleteStoredFile = (
    filePath
) => {

    if (!filePath) {
        return;
    }

    try {

        if (
            fs.existsSync(filePath)
        ) {

            fs.unlinkSync(
                filePath
            );
        }

    } catch (error) {

        console.error(
            "DELETE JOURNEY NOTE FILE ERROR:",
            error.message
        );

    }

};


// =====================================================
// GET ALL NOTES FOR A SEMESTER
// =====================================================

router.get(
    "/:semester",
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const semester =
                Number(
                    req.params.semester
                );


            if (
                !Number.isInteger(
                    semester
                ) ||
                semester < 1 ||
                semester > 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Semester must be between 1 and 8"

                });

            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        user_id,
                        semester,
                        title,
                        content,
                        note_date::text AS note_date,
                        file_name,
                        mime_type,
                        file_size,
                        created_at,
                        updated_at
                    FROM journey_notes
                    WHERE user_id = $1
                      AND semester = $2
                    ORDER BY
                        note_date DESC,
                        created_at DESC
                    `,
                    [
                        userId,
                        semester
                    ]
                );


            res.json({

                success: true,

                notes:
                    result.rows

            });

        } catch (error) {

            console.error(
                "GET JOURNEY NOTES ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load journey notes"

            });

        }

    }
);


// =====================================================
// CREATE NOTE / UPLOAD FILE
// =====================================================

router.post(
    "/",
    upload.single("file"),
    async (req, res) => {

        let uploadedFilePath =
            req.file?.path || null;


        try {

            const userId =
                req.user.userId;

            const semesterNumber =
                Number(
                    req.body.semester
                );

            const title =
                req.body.title;

            const content =
                req.body.content;

            const noteDate =
                req.body.note_date;


            // ---------------------------------------------
            // VALIDATE SEMESTER
            // ---------------------------------------------

            if (
                !Number.isInteger(
                    semesterNumber
                ) ||
                semesterNumber < 1 ||
                semesterNumber > 8
            ) {

                deleteStoredFile(
                    uploadedFilePath
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Semester must be between 1 and 8"

                });

            }


            // ---------------------------------------------
            // VALIDATE TITLE
            // ---------------------------------------------

            if (
                !title ||
                !title.trim()
            ) {

                deleteStoredFile(
                    uploadedFilePath
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Note title is required"

                });

            }


            // ---------------------------------------------
            // INSERT NOTE
            // ---------------------------------------------

            const result =
                await pool.query(
                    `
                    INSERT INTO journey_notes (
                        user_id,
                        semester,
                        title,
                        content,
                        note_date,
                        file_name,
                        mime_type,
                        file_path,
                        file_size
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        COALESCE(
                            NULLIF($5, '')::date,
                            CURRENT_DATE
                        ),
                        $6,
                        $7,
                        $8,
                        $9
                    )
                    RETURNING
                        id,
                        user_id,
                        semester,
                        title,
                        content,
                        note_date::text AS note_date,
                        file_name,
                        mime_type,
                        file_size,
                        created_at,
                        updated_at
                    `,
                    [
                        userId,
                        semesterNumber,
                        title.trim(),
                        content?.trim() || null,
                        noteDate || "",
                        req.file?.originalname || null,
                        req.file?.mimetype || null,
                        req.file?.path || null,
                        req.file?.size || null
                    ]
                );


            // Database successfully saved the file
            uploadedFilePath = null;


            res.status(201).json({

                success: true,

                message:
                    "Journey note created successfully",

                note:
                    result.rows[0]

            });

        } catch (error) {

            deleteStoredFile(
                uploadedFilePath
            );


            console.error(
                "CREATE JOURNEY NOTE ERROR:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to create journey note"

            });

        }

    }
);


// =====================================================
// OPEN NOTE FILE
// =====================================================

router.get(
    "/:id/file",
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const noteId =
                req.params.id;


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        title,
                        file_name,
                        mime_type,
                        file_path
                    FROM journey_notes
                    WHERE id = $1
                      AND user_id = $2
                      AND file_path IS NOT NULL
                    `,
                    [
                        noteId,
                        userId
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Note file not found"

                });

            }


            const note =
                result.rows[0];


            if (
                !fs.existsSync(
                    note.file_path
                )
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Stored note file is missing"

                });

            }


            // ---------------------------------------------
            // SEND FILE INLINE
            // ---------------------------------------------

            res.setHeader(
                "Content-Type",
                note.mime_type ||
                    "application/octet-stream"
            );


            res.setHeader(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(
                    note.file_name ||
                    "note"
                )}"`
            );


            res.sendFile(
                path.resolve(
                    note.file_path
                )
            );

        } catch (error) {

            console.error(
                "OPEN JOURNEY NOTE FILE ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to open note file"

            });

        }

    }
);


// =====================================================
// UPDATE NOTE / REPLACE FILE
// =====================================================

router.put(
    "/:id",
    upload.single("file"),
    async (req, res) => {

        let uploadedFilePath =
            req.file?.path || null;


        try {

            const userId =
                req.user.userId;

            const noteId =
                req.params.id;


            let semesterNumber =
                null;


            if (
                req.body.semester !==
                    undefined &&
                req.body.semester !== ""
            ) {

                semesterNumber =
                    Number(
                        req.body.semester
                    );


                if (
                    !Number.isInteger(
                        semesterNumber
                    ) ||
                    semesterNumber < 1 ||
                    semesterNumber > 8
                ) {

                    deleteStoredFile(
                        uploadedFilePath
                    );

                    return res.status(400).json({

                        success: false,

                        message:
                            "Semester must be between 1 and 8"

                    });

                }

            }


            // ---------------------------------------------
            // VALIDATE TITLE
            // ---------------------------------------------

            if (
                req.body.title !==
                    undefined &&
                !req.body.title.trim()
            ) {

                deleteStoredFile(
                    uploadedFilePath
                );

                return res.status(400).json({

                    success: false,

                    message:
                        "Note title cannot be empty"

                });

            }


            // ---------------------------------------------
            // FIND EXISTING NOTE
            // ---------------------------------------------

            const existingResult =
                await pool.query(
                    `
                    SELECT
                        file_path
                    FROM journey_notes
                    WHERE id = $1
                      AND user_id = $2
                    `,
                    [
                        noteId,
                        userId
                    ]
                );


            if (
                existingResult.rows.length === 0
            ) {

                deleteStoredFile(
                    uploadedFilePath
                );

                return res.status(404).json({

                    success: false,

                    message:
                        "Journey note not found"

                });

            }


            const oldFilePath =
                existingResult
                    .rows[0]
                    .file_path;


            // ---------------------------------------------
            // UPDATE DATABASE
            // ---------------------------------------------

            const result =
                await pool.query(
                    `
                    UPDATE journey_notes
                    SET
                        semester =
                            COALESCE(
                                $1,
                                semester
                            ),

                        title =
                            COALESCE(
                                $2,
                                title
                            ),

                        content = $3,

                        note_date =
                            COALESCE(
                                NULLIF(
                                    $4,
                                    ''
                                )::date,
                                note_date
                            ),

                        file_name =
                            CASE
                                WHEN $5 = TRUE
                                THEN $6
                                ELSE file_name
                            END,

                        mime_type =
                            CASE
                                WHEN $5 = TRUE
                                THEN $7
                                ELSE mime_type
                            END,

                        file_path =
                            CASE
                                WHEN $5 = TRUE
                                THEN $8
                                ELSE file_path
                            END,

                        file_size =
                            CASE
                                WHEN $5 = TRUE
                                THEN $9
                                ELSE file_size
                            END,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $10
                      AND user_id = $11

                    RETURNING
                        id,
                        user_id,
                        semester,
                        title,
                        content,
                        note_date::text AS note_date,
                        file_name,
                        mime_type,
                        file_size,
                        created_at,
                        updated_at
                    `,
                    [
                        semesterNumber,

                        req.body.title !==
                            undefined
                            ? req.body.title.trim()
                            : null,

                        req.body.content?.trim() ||
                            null,

                        req.body.note_date ||
                            "",

                        Boolean(
                            req.file
                        ),

                        req.file?.originalname ||
                            null,

                        req.file?.mimetype ||
                            null,

                        req.file?.path ||
                            null,

                        req.file?.size ||
                            null,

                        noteId,

                        userId
                    ]
                );


            // ---------------------------------------------
            // DELETE OLD FILE
            // ---------------------------------------------

            if (
                req.file
            ) {

                deleteStoredFile(
                    oldFilePath
                );

            }


            uploadedFilePath = null;


            res.json({

                success: true,

                message:
                    "Journey note updated successfully",

                note:
                    result.rows[0]

            });

        } catch (error) {

            deleteStoredFile(
                uploadedFilePath
            );


            console.error(
                "UPDATE JOURNEY NOTE ERROR:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to update journey note"

            });

        }

    }
);


// =====================================================
// DELETE NOTE
// =====================================================

router.delete(
    "/:id",
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const noteId =
                req.params.id;


            const result =
                await pool.query(
                    `
                    DELETE FROM journey_notes
                    WHERE id = $1
                      AND user_id = $2
                    RETURNING
                        id,
                        file_path
                    `,
                    [
                        noteId,
                        userId
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Journey note not found"

                });

            }


            // Delete physical file
            deleteStoredFile(
                result.rows[0].file_path
            );


            res.json({

                success: true,

                message:
                    "Journey note deleted successfully"

            });

        } catch (error) {

            console.error(
                "DELETE JOURNEY NOTE ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to delete journey note"

            });

        }

    }
);


// =====================================================
// MULTER ERROR HANDLER
// =====================================================

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File size must be 500 MB or smaller."

                });

            }


            return res.status(400).json({

                success: false,

                message:
                    error.message

            });

        }


        if (error) {

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "File upload failed"

            });

        }


        next();

    }
);


module.exports = router;