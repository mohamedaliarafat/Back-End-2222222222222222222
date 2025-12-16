// routes/pumps.js
router.post("/", auth.authenticate, pumpController.createPump);
router.get("/", auth.authenticate, pumpController.getMyPumps);

router.post("/:pumpId/integration",
  auth.authenticate,
  pumpIntegrationController.attachIntegration
);

router.post("/transactions",
  auth.authenticate,
  pumpTransactionController.createTransaction
);
 