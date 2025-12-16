module.exports = (io, socket) => {

  // الأدمن يبدأ تتبع سائق
  socket.on("admin:track-driver", ({ driverId }) => {
    socket.join(`track-driver-${driverId}`);
    console.log(`👁 Admin tracking driver ${driverId}`);
  });

  // السائق يرسل موقعه
  socket.on("driver:location", (data) => {
    /*
      data = {
        driverId,
        lat,
        lng,
        heading,
        speed
      }
    */

    socket
      .to(`track-driver-${data.driverId}`)
      .emit("driver:location:update", data);
  });

};
