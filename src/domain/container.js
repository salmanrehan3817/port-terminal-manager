// Pure data holder. No methods (per Part 12.1).
// States (Part 3.3): "inYard" | "onShip" | "delivered"
export class Container {
    constructor(id, weight, dest) {
        this.id = id;
        this.weight = weight;
        this.dest = dest;
        this.status = "inYard";
        this.shipId = null;
    }
}