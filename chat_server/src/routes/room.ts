import express, { Request } from 'express';
const router = express.Router();
import { createChatRoomIfNotExist, readMessageToIndex, uploadMessageToFeed } from '../utils/roomInitUtils';


// Create new room
router.post('/create', async function (req: Request, res) {
    try {
        const createResult = await createChatRoomIfNotExist(req.body.roomId);

        if (createResult) {
            res.status(200);
            res.send({ message: "Room created!", roomId: req.body.roomId });
        }

    } catch (error) {
        console.error("There was an error while trying to create new chat room: ", error);
        res.status(500);
        res.send({ message: "There was an error while trying to create new chat room", error });
    }
});

// Send message to room
router.post('/send', async function (req: Request, res) {
    try {
        const reference = await uploadMessageToFeed(req.body.message, req.body.roomId);

        res.status(200);
        res.send({ reference: reference })
    } catch (error) {
        console.error(`There was an error while sending message to room ${req.body.roomId}`);
        res.status(500);
        res.send({ message: `There was an error while sending message to room ${req.body.roomId}`, error});
    }
});

// Get message for room, with index
router.get('/read', async function (req: Request, res) {
    try {
        const index: number = parseInt(req.query.index as string, 10);
        if (isNaN(index)) throw "Index is not a valid number!";
        const roomId = req.query.roomId as string;
        if (roomId.length === 0) throw "No roomId provided!";

        const message = await readMessageToIndex(index, roomId);

        res.status(200);
        res.send(message);
    } catch (error) {
        console.error(`There was an error while reading message with index ${req.query.index} in room ${req.query.roomId}`);
        res.status(500);
        res.send({ 
            message: `There was an error while reading message with index ${req.query.index} in room ${req.query.roomId}`,
            error
        });
    }
});

module.exports = router;